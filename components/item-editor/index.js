Component({
  properties: {
    show: Boolean,
    itemData: Object, // { id, content, tagId, startTime, endTime }
    sessionDate: Number, // base timestamp for the session (if allowTimeEdit is true)
    sessionStart: Number,
    sessionEnd: Number,
    allowTimeEdit: Boolean
  },
  data: {
    content: '',
    tagId: '',
    tagName: '',
    startTimeStr: '',
    endTimeStr: '',
    minTime: '00:00',
    maxTime: '23:59',
    tags: [],
    tagNames: [],
    showTagPicker: false
  },
  observers: {
    'show': function(show) {
      if (show) {
        const tags = wx.getStorageSync('tags') || [];
        const tagNames = tags.map(t => t.name);
        const data = this.properties.itemData || {};
        const tagId = data.tagId || 'tag_other';
        const tag = tags.find(t => t.id === tagId) || tags[0] || { name: '其他', id: 'tag_other' };
        
        let startTimeStr = '';
        let endTimeStr = '';
        let minTime = '00:00';
        let maxTime = '23:59';

        // Calculate min/max from sessionStart/End
        if (this.properties.sessionStart) {
          const sDate = new Date(this.properties.sessionStart);
          minTime = `${this.pad(sDate.getHours())}:${this.pad(sDate.getMinutes())}`;
        }
        if (this.properties.sessionEnd) {
          const eDate = new Date(this.properties.sessionEnd);
          maxTime = `${this.pad(eDate.getHours())}:${this.pad(eDate.getMinutes())}`;
        }

        if (data.startTime) {
          const d = new Date(data.startTime);
          startTimeStr = `${this.pad(d.getHours())}:${this.pad(d.getMinutes())}`;
        } else if (this.properties.sessionStart) {
          // Default to session start time for new items
          startTimeStr = minTime;
        }

        if (data.endTime) {
          const d = new Date(data.endTime);
          endTimeStr = `${this.pad(d.getHours())}:${this.pad(d.getMinutes())}`;
        } else if (this.properties.sessionEnd) {
          // It's usually better to leave end time empty so they don't get a default equal to start
          // endTimeStr = maxTime;
        }

        this.setData({
          tags,
          tagNames,
          content: data.content || '',
          tagId: tag.id,
          tagName: tag.name,
          startTimeStr,
          endTimeStr,
          minTime,
          maxTime
        });
      }
    }
  },
  methods: {
    pad(n) { return n < 10 ? '0' + n : n; },
    onContentChange(e) { this.setData({ content: e.detail }); },
    openTagPicker() { this.setData({ showTagPicker: true }); },
    closeTagPicker() { this.setData({ showTagPicker: false }); },
    onTagConfirm(e) {
      const { value, index } = e.detail;
      this.setData({ tagName: value, tagId: this.data.tags[index].id, showTagPicker: false });
    },
    onStartTimeChange(e) { this.setData({ startTimeStr: e.detail.value }); },
    onEndTimeChange(e) { this.setData({ endTimeStr: e.detail.value }); },
    clearTime() { this.setData({ startTimeStr: '', endTimeStr: '' }); },
    onCancel() { this.triggerEvent('cancel'); },
    onSave() {
      if (!this.data.content.trim()) {
        wx.showToast({ title: '请输入事项名称', icon: 'none' });
        return;
      }
      let startTime = this.properties.itemData ? this.properties.itemData.startTime : null;
      let endTime = this.properties.itemData ? this.properties.itemData.endTime : null;

      if (this.properties.allowTimeEdit) {
        const baseDate = new Date(this.properties.sessionDate || Date.now());
        if (this.data.startTimeStr) {
          const [h, m] = this.data.startTimeStr.split(':').map(Number);
          startTime = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), h, m).getTime();
        } else {
          startTime = null;
        }
        if (this.data.endTimeStr) {
          const [h, m] = this.data.endTimeStr.split(':').map(Number);
          endTime = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), h, m).getTime();
        } else {
          endTime = null;
        }
        if (startTime && endTime && endTime <= startTime) {
          wx.showToast({ title: '结束必须晚于开始', icon: 'none' });
          return;
        }

        // Verify if the times are within the session range
        if (this.properties.sessionStart && startTime && startTime < this.properties.sessionStart) {
          wx.showToast({ title: '时间需在专注时段内', icon: 'none' });
          return;
        }
        if (this.properties.sessionEnd && endTime && endTime > this.properties.sessionEnd) {
          wx.showToast({ title: '时间需在专注时段内', icon: 'none' });
          return;
        }
        if (this.properties.sessionEnd && startTime && startTime > this.properties.sessionEnd) {
          wx.showToast({ title: '时间需在专注时段内', icon: 'none' });
          return;
        }
        if (this.properties.sessionStart && endTime && endTime < this.properties.sessionStart) {
          wx.showToast({ title: '时间需在专注时段内', icon: 'none' });
          return;
        }

      } else {
        if (!startTime) startTime = Date.now();
      }

      this.triggerEvent('save', {
        id: this.properties.itemData ? this.properties.itemData.id : '',
        content: this.data.content.trim(),
        tagId: this.data.tagId,
        startTime,
        endTime
      });
    }
  }
});