import Toast from '@vant/weapp/toast/toast';
const { generateId, formatNumber } = require('../../utils/util.js');
const storage = require('../../utils/storage.js');

Page({
  data: {
    sessionId: '',
    durationObj: { h: '00', m: '00' },
    items: [],
    tags: [],
    tagNames: [],
    showEditor: false,
    editingItem: null,
    sessionData: null
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ sessionId: options.id });
    }
    this.initData();
  },

  initData() {
    const sessions = storage.getSessions();
    const session = sessions.find(s => s.id === this.data.sessionId);
    if (!session) return;
    
    const durationSec = session.duration;
    const h = Math.floor(durationSec / 3600);
    let m = Math.floor((durationSec % 3600) / 60);
    if (h === 0 && m === 0 && durationSec > 0) {
      m = 1;
    }

    const tags = storage.getTags();
    const tagNames = tags.map(t => t.name);

    // format items with tag colors
    const items = session.items.map(item => {
      const tag = tags.find(t => t.id === item.tagId) || tags[0];
      return {
        ...item,
        tagName: tag.name,
        tagColor: tag.color,
        timeRangeStr: this.formatTimeRangeStr(item.startTime, item.endTime)
      };
    });

    this.setData({
      durationObj: { h: formatNumber(h), m: formatNumber(m) },
      items,
      tags,
      tagNames,
      sessionData: session
    });

    if (items.length === 0) {
      setTimeout(() => {
        this.openAddItem();
      }, 500);
    }
  },

  formatTimeRangeStr(startTime, endTime) {
    if (!startTime || !endTime) return '';
    const start = new Date(startTime);
    const end = new Date(endTime);
    return `${formatNumber(start.getHours())}:${formatNumber(start.getMinutes())} - ${formatNumber(end.getHours())}:${formatNumber(end.getMinutes())}`;
  },

  deleteItem(e) {
    const { id } = e.currentTarget.dataset;
    const items = this.data.items.filter(item => item.id !== id);
    this.setData({ items });
    this.syncToStorage();
  },

  openAddItem() {
    this.setData({
      showEditor: true,
      editingItem: null
    });
  },

  editItem(e) {
    const { id } = e.currentTarget.dataset;
    const item = this.data.items.find(i => i.id === id);
    if (!item) return;

    this.setData({
      showEditor: true,
      editingItem: item
    });
  },

  closeEditor() {
    this.setData({ showEditor: false, editingItem: null });
  },

  onItemSave(e) {
    const newItemData = e.detail;
    
    if (newItemData.id) {
      // Edit existing
      const items = [...this.data.items];
      const index = items.findIndex(i => i.id === newItemData.id);
      if (index !== -1) {
        const tag = this.data.tags.find(t => t.id === newItemData.tagId) || this.data.tags[0];
        items[index].content = newItemData.content;
        items[index].tagId = tag.id;
        items[index].tagName = tag.name;
        items[index].tagColor = tag.color;
        items[index].startTime = newItemData.startTime;
        items[index].endTime = newItemData.endTime;
        items[index].timeRangeStr = this.formatTimeRangeStr(newItemData.startTime, newItemData.endTime);
        this.setData({ items });
      }
    } else {
      // Add new
      const tag = this.data.tags.find(t => t.id === newItemData.tagId) || this.data.tags[0];
      const newItem = {
        id: generateId('item'),
        content: newItemData.content,
        tagId: tag.id,
        tagName: tag.name,
        tagColor: tag.color,
        startTime: newItemData.startTime || Date.now(),
        endTime: newItemData.endTime || null,
        timeRangeStr: this.formatTimeRangeStr(newItemData.startTime, newItemData.endTime)
      };
      this.setData({
        items: [...this.data.items, newItem]
      });
    }

    this.closeEditor();
    this.syncToStorage();
  },

  syncToStorage() {
    const itemsToSave = this.data.items.map(item => ({
      id: item.id,
      content: item.content,
      tagId: item.tagId,
      startTime: item.startTime,
      endTime: item.endTime
    }));
    
    // Recalculate tag durations
    const tagDurations = this.calculateTagDurations(this.data.sessionData.duration, itemsToSave);
    
    storage.updateSession(this.data.sessionId, { 
      items: itemsToSave,
      tagDurations: tagDurations 
    });
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
  },

  goHome() {
    // Navigate back to home if user wants to explicitly leave, but native back button works too.
    wx.switchTab({
      url: '/pages/index/index'
    });
  }
});
