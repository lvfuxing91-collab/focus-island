const { formatDuration } = require('../../utils/util.js');

const app = getApp();

Page({
  data: {
    mode: 'free', // 'free' or 'pomodoro'
    pomodoroPreset: 1500, // 25 min default
    presetDisplay: '25:00',
  },

  onLoad() {
    this.updateDisplay();
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().init();
    }
    // If timer is running, redirect to timer page
    if (app.globalData.timerState.isRunning) {
      wx.navigateTo({
        url: '/pages/timer/index'
      });
    }
  },

  switchMode(e) {
    const { mode } = e.currentTarget.dataset;
    this.setData({ mode });
  },

  selectPreset(e) {
    const preset = parseInt(e.currentTarget.dataset.preset, 10);
    this.setData({ pomodoroPreset: preset }, () => {
      this.updateDisplay();
    });
  },

  updateDisplay() {
    this.setData({
      presetDisplay: formatDuration(this.data.pomodoroPreset)
    });
  },

  startFocus() {
    const { mode, pomodoroPreset } = this.data;
    
    // Init timer state
    app.globalData.timerState = {
      isRunning: true,
      isPaused: false,
      mode,
      pomodoroPreset: mode === 'pomodoro' ? pomodoroPreset : 0,
      startTime: Date.now(),
      pausedDuration: 0,
      pauseStartTime: 0,
      currentItems: [],
      lastSnapshotTime: Date.now(),
      displayTime: mode === 'pomodoro' ? formatDuration(pomodoroPreset) : '00:00',
      duration: 0
    };

    app.startGlobalTimer();

    // Save initial snapshot
    wx.setStorageSync('timer_snapshot', app.globalData.timerState);

    wx.navigateTo({
      url: '/pages/timer/index'
    });
  }
});