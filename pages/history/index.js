const storage = require('../../utils/storage.js');
const { formatTime } = require('../../utils/util.js');

Page({
  data: {
    activeTab: 0,
    sessions: [],
    groupedSessions: [],
    activeNames: [], // For collapse items
    tagColors: {
      'tag_study': '#4A90D9',
      'tag_work': '#E8934A',
      'tag_exercise': '#5BAD6F',
      'tag_other': '#9B9B9B'
    },
    showEditor: false,
    editingSessionId: null,
    editingItem: null,
    editingSessionDate: null,
    editingSessionStart: null,
    editingSessionEnd: null
  },

  onShow() {
    this.loadData();
  },

  onTabChange(event) {
    this.setData({
      activeTab: event.detail.index
    }, () => {
      this.loadData();
    });
  },

  onCollapseChange(event) {
    this.setData({
      activeNames: event.detail
    });
  },

  loadData() {
    const allSessions = storage.getSessions();
    const tags = storage.getTags();
    const { activeTab } = this.data;

    let filteredSessions = allSessions;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    if (activeTab === 1) { // 本周
      const day = now.getDay() || 7;
      const weekStart = todayStart - (day - 1) * 86400000;
      filteredSessions = allSessions.filter(s => s.createdAt >= weekStart);
    } else if (activeTab === 2) { // 本月
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      filteredSessions = allSessions.filter(s => s.createdAt >= monthStart);
    }

    // Group by date
    const groups = {};
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

    filteredSessions.forEach(session => {
      const dateObj = new Date(session.createdAt);
      const year = dateObj.getFullYear();
      const month = dateObj.getMonth() + 1;
      const day = dateObj.getDate();
      const dateKey = `${year}/${month}/${day}`;
      const dateDisplay = `${year}年${month}月${day}日`;
      const weekDay = weekDays[dateObj.getDay()];
      const fullDateTitle = `${dateDisplay} ${weekDay}`;

      if (!groups[dateKey]) {
        groups[dateKey] = {
          title: fullDateTitle,
          totalDuration: 0,
          timestamp: new Date(year, month - 1, day).getTime(),
          items: []
        };
      }

      // Format session for display
      const startTime = session.startTime ? new Date(session.startTime) : null;
      const timeStr = startTime ? `${this.formatNumber(startTime.getHours())}:${this.formatNumber(startTime.getMinutes())}` : '--:--';
      
      const uniqueTags = [];
      const tagIds = new Set();
      session.items.forEach(item => {
        const tag = tags.find(t => t.id === item.tagId) || tags[0];
        if (!tagIds.has(tag.id)) {
          tagIds.add(tag.id);
          uniqueTags.push({ id: tag.id, color: tag.color, name: tag.name });
        }
      });
      if (uniqueTags.length === 0) {
        const defaultTag = tags.find(t => t.id === 'tag_other') || tags[0] || { color: '#9B9B9B', name: '其他' };
        uniqueTags.push({ id: defaultTag.id, color: defaultTag.color, name: defaultTag.name });
      }
      
      const displaySession = {
        ...session,
        timeStr,
        uniqueTags,
        itemCount: session.items.length,
        durationMin: Math.ceil(session.duration / 60),
        formattedItems: session.items.map(item => {
          const itemTag = tags.find(t => t.id === item.tagId) || { name: '其他' };
          let timeRangeStr = '';
          if (item.startTime && item.endTime) {
            const s = new Date(item.startTime);
            const e = new Date(item.endTime);
            timeRangeStr = `${this.formatNumber(s.getHours())}:${this.formatNumber(s.getMinutes())} - ${this.formatNumber(e.getHours())}:${this.formatNumber(e.getMinutes())}`;
          }
          return {
            ...item,
            tagName: itemTag.name,
            tagColor: itemTag.color,
            timeRangeStr
          };
        })
      };

      groups[dateKey].totalDuration += session.duration;
      groups[dateKey].items.push(displaySession);
    });

    // Convert groups object to array and sort by date
    const groupedArray = Object.keys(groups).sort((a, b) => {
      return groups[b].timestamp - groups[a].timestamp;
    }).map(key => ({
      ...groups[key],
      totalDurationStr: this.formatTotalDuration(groups[key].totalDuration)
    }));

    this.setData({
      groupedSessions: groupedArray,
      sessions: filteredSessions
    });
  },

  formatTotalDuration(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.ceil((seconds % 3600) / 60);
    if (h > 0) {
      return `${h}小时${m}分钟`;
    }
    return `${m}分钟`;
  },

  formatNumber(n) {
    n = n.toString();
    return n[1] ? n : `0${n}`;
  },

  goToHome() {
    wx.switchTab({
      url: '/pages/index/index'
    });
  },

  onItemClick(e) {
    const { sessionId, itemId } = e.currentTarget.dataset;
    const allSessions = storage.getSessions();
    const session = allSessions.find(s => s.id === sessionId);
    if (!session) return;
    const item = session.items.find(i => i.id === itemId);
    if (!item) return;

    this.setData({
      showEditor: true,
      editingSessionId: sessionId,
      editingItem: item,
      editingSessionDate: session.startTime,
      editingSessionStart: session.startTime,
      editingSessionEnd: session.endTime
    });
  },

  onItemAdd(e) {
    const { sessionId } = e.currentTarget.dataset;
    const allSessions = storage.getSessions();
    const session = allSessions.find(s => s.id === sessionId);
    if (!session) return;

    this.setData({
      showEditor: true,
      editingSessionId: sessionId,
      editingItem: null,
      editingSessionDate: session.startTime,
      editingSessionStart: session.startTime,
      editingSessionEnd: session.endTime
    });
  },

  onItemDelete(e) {
    const { sessionId, itemId } = e.currentTarget.dataset;
    wx.showModal({
      title: '删除确认',
      content: '确定要删除该事项吗？',
      success: (res) => {
        if (res.confirm) {
          const allSessions = storage.getSessions();
          const sessionIndex = allSessions.findIndex(s => s.id === sessionId);
          if (sessionIndex !== -1) {
            const session = allSessions[sessionIndex];
            const newItems = session.items.filter(i => i.id !== itemId);
            const tagDurations = this.calculateTagDurations(session.duration, newItems);
            session.items = newItems;
            session.tagDurations = tagDurations;
            wx.setStorageSync('focus_sessions', allSessions);
            this.loadData();
          }
        }
      }
    });
  },

  onEditorCancel() {
    this.setData({ showEditor: false, editingItem: null, editingSessionId: null });
  },

  onEditorSave(e) {
    const { id, content, tagId, startTime, endTime } = e.detail;
    const { editingSessionId } = this.data;
    
    const allSessions = storage.getSessions();
    const sessionIndex = allSessions.findIndex(s => s.id === editingSessionId);
    if (sessionIndex === -1) return;
    
    const session = allSessions[sessionIndex];
    let items = [...session.items];
    
    if (id) {
      const itemIndex = items.findIndex(i => i.id === id);
      if (itemIndex !== -1) {
        items[itemIndex] = { ...items[itemIndex], content, tagId, startTime, endTime };
      }
    } else {
      const { generateId } = require('../../utils/util.js');
      items.push({
        id: generateId('item'),
        content,
        tagId,
        startTime: startTime || null,
        endTime: endTime || null
      });
    }
    
    const tagDurations = this.calculateTagDurations(session.duration, items);
    session.items = items;
    session.tagDurations = tagDurations;
    wx.setStorageSync('focus_sessions', allSessions);
    
    this.setData({ showEditor: false, editingItem: null, editingSessionId: null });
    this.loadData();
    wx.showToast({ title: '保存成功', icon: 'success' });
  },

  calculateTagDurations(totalDuration, items) {
    const tagDurations = {};
    if (!items || items.length === 0) {
      tagDurations['tag_other'] = totalDuration;
      return tagDurations;
    }

    const editedItems = items.filter(item => item.startTime && item.endTime);
    if (editedItems.length > 0) {
      items.forEach(item => {
        const tagId = item.tagId || 'tag_other';
        if (item.startTime && item.endTime) {
          const d = Math.floor((item.endTime - item.startTime) / 1000);
          tagDurations[tagId] = (tagDurations[tagId] || 0) + d;
        }
      });
    } else {
      const uniqueTags = [...new Set(items.map(item => item.tagId || 'tag_other'))];
      const perTagDuration = Math.floor(totalDuration / uniqueTags.length);
      uniqueTags.forEach(tagId => {
        tagDurations[tagId] = perTagDuration;
      });
      if (uniqueTags.length > 0) {
        const remainder = totalDuration - (perTagDuration * uniqueTags.length);
        tagDurations[uniqueTags[0]] += remainder;
      }
    }
    return tagDurations;
  }
});
