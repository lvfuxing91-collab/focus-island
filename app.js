// app.js
const { formatDuration } = require('./utils/util.js');

App({
  onLaunch() {
    this.initTags();
    this.checkAbnormalSession();
  },
  
  onShow() {
    // 每次显示时检查系统时间校准等
    this.checkTimerSync();
  },

  onHide() {
    // 存一个时间戳，用于计算切后台的时间
    wx.setStorageSync('lastHideTime', Date.now());
  },

  globalData: {
    timerState: {
      isRunning: false,
      isPaused: false,
      mode: 'free', // 'free' or 'pomodoro'
      startTime: 0,
      pausedDuration: 0,
      pauseStartTime: 0,
      pomodoroPreset: 0, // seconds
      currentItems: [],
      lastSnapshotTime: 0,
      displayTime: '00:00'
    },
    globalTimer: null,
    globalSnapshotTimer: null
  },

  startGlobalTimer() {
    if (this.globalData.globalTimer) clearInterval(this.globalData.globalTimer);
    this.globalData.globalTimer = setInterval(() => {
      this.updateGlobalTimerDisplay();
    }, 1000);
    
    if (this.globalData.globalSnapshotTimer) clearInterval(this.globalData.globalSnapshotTimer);
    this.globalData.globalSnapshotTimer = setInterval(() => {
      this.globalData.timerState.lastSnapshotTime = Date.now();
      wx.setStorageSync('timer_snapshot', this.globalData.timerState);
    }, 30000);
  },

  stopGlobalTimer() {
    if (this.globalData.globalTimer) {
      clearInterval(this.globalData.globalTimer);
      this.globalData.globalTimer = null;
    }
    if (this.globalData.globalSnapshotTimer) {
      clearInterval(this.globalData.globalSnapshotTimer);
      this.globalData.globalSnapshotTimer = null;
    }
  },

  updateGlobalTimerDisplay() {
    const state = this.globalData.timerState;
    if (!state.isRunning || state.isPaused) return;

    const now = Date.now();
    const elapsed = Math.floor((now - state.startTime) / 1000) - state.pausedDuration;
    
    const displayTime = state.mode === 'pomodoro' ? 
      formatDuration(Math.max(0, state.pomodoroPreset - elapsed)) : 
      formatDuration(elapsed);

    state.displayTime = displayTime;
    state.duration = elapsed;

    if (state.mode === 'pomodoro') {
      const remaining = state.pomodoroPreset - elapsed;
      if (remaining <= 0) {
        state.displayTime = '00:00';
        this.globalTimerFinished();
      }
    } else {
      if (elapsed >= 8 * 3600) {
        this.globalTimerFinished();
      }
    }
  },

  globalTimerFinished() {
    this.stopGlobalTimer();
    const duration = this.globalData.timerState.duration;
    
    // If timer page is open, let it handle it. Otherwise, handle it here.
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    if (currentPage && currentPage.route === 'pages/timer/index' && typeof currentPage.timerFinished === 'function') {
      currentPage.timerFinished();
    } else {
      // Background finish
      this.globalData.timerState.isRunning = false;
      wx.removeStorageSync('timer_snapshot');
      
      const endTime = Date.now();
      const startTime = this.globalData.timerState.startTime;
      
      // Calculate tag durations (simplified, Rule C)
      const items = this.globalData.timerState.currentItems;
      const tagDurations = {};
      if (!items || items.length === 0) {
        tagDurations['tag_other'] = duration;
      } else {
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
          const perTagDuration = Math.floor(duration / uniqueTags.length);
          uniqueTags.forEach(tagId => { tagDurations[tagId] = perTagDuration; });
          if (uniqueTags.length > 0) {
            tagDurations[uniqueTags[0]] += duration - (perTagDuration * uniqueTags.length);
          }
        }
      }

      const session = {
        id: `session_${startTime}`,
        mode: this.globalData.timerState.mode,
        pomodoroPreset: this.globalData.timerState.pomodoroPreset || null,
        startTime: startTime,
        endTime: endTime,
        duration: duration,
        isAbandoned: false,
        isInterrupted: false,
        tagDurations: tagDurations,
        items: items.map(item => ({
          id: item.id,
          content: item.content,
          tagId: item.tagId,
          startTime: item.startTime,
          endTime: item.endTime
        })),
        createdAt: endTime
      };

      const storage = require('./utils/storage.js');
      storage.saveSession(session);
      this.globalData.timerState.currentItems = [];
      
      try { wx.vibrateLong(); } catch(e) {}
      
      // Navigate to record page
      wx.navigateTo({
        url: `/pages/record/index?id=${session.id}`,
        fail: () => {
          wx.redirectTo({
            url: `/pages/record/index?id=${session.id}`
          });
        }
      });
    }
  },

  initTags() {
    const tags = wx.getStorageSync('tags');
    if (!tags || tags.length === 0) {
      const defaultTags = [
        { id: "tag_study", name: "学习", color: "#4A90D9", isDefault: true },
        { id: "tag_work", name: "工作", color: "#E8934A", isDefault: true },
        { id: "tag_exercise", name: "运动", color: "#5BAD6F", isDefault: true },
        { id: "tag_other", name: "其他", color: "#9B9B9B", isDefault: true }
      ];
      wx.setStorageSync('tags', defaultTags);
    }
  },

  checkAbnormalSession() {
    const snapshot = wx.getStorageSync('timer_snapshot');
    if (snapshot && snapshot.isRunning) {
      // Detected an interrupted session
      const now = Date.now();
      const elapsed = Math.floor((now - snapshot.startTime - snapshot.pausedDuration * 1000) / 1000);
      
      wx.showModal({
        title: '专注异常中断',
        content: `检测到一段未正常结束的专注（约${Math.floor(elapsed / 60)}分钟），是否补录？`,
        confirmText: '保存记录',
        cancelText: '放弃',
        success: (res) => {
          if (res.confirm) {
            this.saveInterruptedSession(snapshot, now);
          } else {
            wx.removeStorageSync('timer_snapshot');
          }
        }
      });
    }
  },

  saveInterruptedSession(snapshot, now) {
    const session = {
      id: `session_${snapshot.startTime}`,
      mode: snapshot.mode,
      pomodoroPreset: snapshot.pomodoroPreset || null,
      startTime: snapshot.startTime,
      endTime: now,
      duration: Math.floor((now - snapshot.startTime - snapshot.pausedDuration * 1000) / 1000),
      isAbandoned: false,
      isInterrupted: true,
      items: snapshot.currentItems || [],
      createdAt: now
    };

    const sessions = wx.getStorageSync('focus_sessions') || [];
    sessions.unshift(session);
    
    // Check storage limit
    if (sessions.length > 1000) {
      sessions.pop(); // Remove oldest
    }
    
    wx.setStorageSync('focus_sessions', sessions);
    wx.removeStorageSync('timer_snapshot');
    
    wx.showToast({
      title: '已补录',
      icon: 'success'
    });
  },

  checkTimerSync() {
    // Timer sync logic when returning from background
    const lastHideTime = wx.getStorageSync('lastHideTime');
    if (lastHideTime && this.globalData.timerState.isRunning) {
      // Event event bus can notify timer page to refresh its display
      wx.removeStorageSync('lastHideTime');
    }
  }
});