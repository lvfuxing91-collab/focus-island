import Dialog from '@vant/weapp/dialog/dialog';
const { formatDuration, generateId } = require('../../utils/util.js');

const app = getApp();

Page({
  data: {
    displayTime: '00:00',
    progress: 0,
    isPaused: false,
    itemNum: 0,
    showAddItem: false,
    newItemContent: '',
    duration: 0,
    tags: [],
    tagNames: [],
    showTagPicker: false,
    selectedTagName: '',
    editingItemId: null,
    currentItems: [],
    newItem: {
      content: '',
      tagId: ''
    }
  },

  timer: null,
  snapshotTimer: null,

  onLoad() {
    if (!app.globalData.timerState.isRunning) {
      wx.navigateBack();
      return;
    }
    this.syncState();
    this.startTimer();
    this.startSnapshot();
    this.initTags();
  },

  initTags() {
    const storage = require('../../utils/storage.js');
    const tags = storage.getTags();
    const tagNames = tags.map(t => t.name);
    this.setData({ tags, tagNames });
  },

  onShow() {
    this.syncState();
    this.initTags();
  },

  onUnload() {
    this.stopTimer();
    this.stopSnapshot();
  },

  syncState() {
    const state = app.globalData.timerState;
    this.setData({ isPaused: state.isPaused });
    
    // Format items with tags
    const items = state.currentItems.map(item => {
      const tag = this.data.tags.find(t => t.id === item.tagId) || this.data.tags[0] || { name: '其他', color: '#95A5A6' };
      return {
        ...item,
        tagName: tag.name,
        tagColor: tag.color
      };
    });

    this.setData({
      itemNum: state.currentItems.length,
      currentItems: items
    });
    this.updateTimerDisplay();
  },

  startTimer() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.syncState();
    }, 1000);
  },

  stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  },

  startSnapshot() {
    // handled globally now
  },

  stopSnapshot() {
    // handled globally now
  },

  updateTimerDisplay() {
    const state = app.globalData.timerState;
    if (!state.isRunning) return;

    this.setData({ 
      duration: state.duration,
      displayTime: state.displayTime
    });

    if (state.mode === 'pomodoro') {
      const elapsed = state.duration;
      const remaining = state.pomodoroPreset - elapsed;
      if (remaining <= 0) {
        this.setData({ displayTime: '00:00', progress: 100 });
      } else {
        this.setData({ 
          progress: ((state.pomodoroPreset - remaining) / state.pomodoroPreset) * 100
        });
      }
    } else {
      const elapsed = state.duration;
      if (elapsed < 8 * 3600) {
        this.setData({
          progress: (elapsed / (8 * 3600)) * 100
        });
      }
    }
  },

  togglePause() {
    const isPaused = !this.data.isPaused;
    this.setData({ isPaused });
    app.globalData.timerState.isPaused = isPaused;

    if (isPaused) {
      app.globalData.timerState.pauseStartTime = Date.now();
    } else {
      const pauseDuration = Math.floor((Date.now() - app.globalData.timerState.pauseStartTime) / 1000);
      app.globalData.timerState.pausedDuration += pauseDuration;
      app.globalData.timerState.pauseStartTime = 0;
    }
    wx.setStorageSync('timer_snapshot', app.globalData.timerState);
  },

  timerFinished() {
    this.stopTimer();
    app.stopGlobalTimer();
    const duration = this.data.duration;
    this.saveSessionAndGo(duration);
  },

  confirmEnd() {
    Dialog.confirm({
      title: '结束专注',
      message: '确定要结束本次专注吗？',
    }).then(() => {
      this.stopTimer();
      app.stopGlobalTimer();
      const duration = this.data.duration;
      this.saveSessionAndGo(duration);
    }).catch(() => {});
  },

  saveSessionAndGo(duration) {
    const state = app.globalData.timerState;
    state.isRunning = false;
    wx.removeStorageSync('timer_snapshot');

    const endTime = Date.now();
    const startTime = state.startTime;
    
    // Calculate tag durations based on rules
    const tagDurations = this.calculateTagDurations(duration, state.currentItems);

    // Create session and save
    const session = {
      id: `session_${startTime}`,
      mode: state.mode,
      pomodoroPreset: state.pomodoroPreset || null,
      startTime: startTime,
      endTime: endTime,
      duration: duration,
      isAbandoned: false,
      isInterrupted: false,
      tagDurations: tagDurations,
      items: state.currentItems.map(item => ({
        id: item.id,
        content: item.content,
        tagId: item.tagId,
        startTime: item.startTime, // This might be null if not edited
        endTime: item.endTime      // This might be null if not edited
      })),
      createdAt: endTime
    };

    const storage = require('../../utils/storage.js');
    storage.saveSession(session);

    // Reset currentItems
    state.currentItems = [];
    
    try {
      wx.vibrateLong();
    } catch(e) {}

    wx.showToast({
      title: '专注完成',
      icon: 'success'
    });

    // Pass session id to record page
    wx.redirectTo({
      url: `/pages/record/index?id=${session.id}`,
      fail: (err) => {
        console.error('Redirect failed', err);
        wx.switchTab({
          url: '/pages/index/index'
        });
      }
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
      // Rule B: Multiple items + edited times
      // Note: In the current UI, items are added during focus. 
      // Rule B applies if user long-presses in history (implemented later) or if we add it to record page.
      // For now, if any item has startTime/endTime, we use Rule B for those.
      items.forEach(item => {
        const tagId = item.tagId || 'tag_other';
        if (item.startTime && item.endTime) {
          const d = Math.floor((item.endTime - item.startTime) / 1000);
          tagDurations[tagId] = (tagDurations[tagId] || 0) + d;
        }
      });
      // Any remaining time or unedited items? 
      // The requirement says "如有重叠或空隙，以用户填写为准，不做额外校验"
    } else {
      // Rule C: No edited times (Main flow)
      // Get unique tags
      const uniqueTags = [...new Set(items.map(item => item.tagId || 'tag_other'))];
      const perTagDuration = Math.floor(totalDuration / uniqueTags.length);
      
      uniqueTags.forEach(tagId => {
        tagDurations[tagId] = perTagDuration;
      });
      
      // Handle rounding remainder
      if (uniqueTags.length > 0) {
        const remainder = totalDuration - (perTagDuration * uniqueTags.length);
        tagDurations[uniqueTags[0]] += remainder;
      }
    }

    return tagDurations;
  },

  confirmAbandon() {
    const { duration } = this.data;
    if (duration < 60) {
      // less than 1 min, direct abandon
      this.abandonSession();
      return;
    }

    Dialog.confirm({
      title: '放弃专注',
      message: '专注时间已超过1分钟，确定要放弃吗？',
      confirmButtonText: '确定放弃',
      cancelButtonText: '误操作'
    }).then(() => {
      this.abandonSession();
    }).catch(() => {});
  },

  abandonSession() {
    this.stopTimer();
    app.stopGlobalTimer();
    app.globalData.timerState.isRunning = false;
    wx.removeStorageSync('timer_snapshot');
    wx.switchTab({
      url: '/pages/index/index'
    });
  },

  openAddItem() {
    this.setData({ 
      showEditor: true, 
      editingItem: null
    });
  },

  editItem(e) {
    const { id } = e.currentTarget.dataset;
    const item = app.globalData.timerState.currentItems.find(i => i.id === id);
    if (!item) return;

    this.setData({
      showEditor: true,
      editingItem: item
    });
  },

  closeEditor() {
    this.setData({ showEditor: false, editingItem: null });
  },

  deleteItem(e) {
    const { id } = e.currentTarget.dataset;
    const items = app.globalData.timerState.currentItems.filter(i => i.id !== id);
    app.globalData.timerState.currentItems = items;
    this.syncState();
  },

  onItemSave(e) {
    const newItemData = e.detail;

    if (newItemData.id) {
      // Edit existing
      const index = app.globalData.timerState.currentItems.findIndex(i => i.id === newItemData.id);
      if (index !== -1) {
        app.globalData.timerState.currentItems[index].content = newItemData.content;
        app.globalData.timerState.currentItems[index].tagId = newItemData.tagId;
      }
    } else {
      // Add new
      const newItem = {
        id: generateId('item'),
        content: newItemData.content,
        tagId: newItemData.tagId || 'tag_other',
        startTime: Date.now(),
      };
      app.globalData.timerState.currentItems.push(newItem);
    }

    this.syncState();
    this.closeEditor();
  },


});