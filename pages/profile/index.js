const storage = require('../../utils/storage.js');

Page({
  data: {
    totalDurationH: '0.0',
    totalCount: 0,
    avatarUrl: '',
    nickname: '',
    isEditingNickname: false
  },

  onLoad() {
    this.initUserInfo();
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().init();
    }
    this.loadData();
    this.initUserInfo();
  },

  initUserInfo() {
    const avatarUrl = wx.getStorageSync('userAvatar') || '';
    const nickname = wx.getStorageSync('userNickname') || '专注岛用户';
    this.setData({ avatarUrl, nickname });
  },

  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    this.setData({ avatarUrl });
    wx.setStorageSync('userAvatar', avatarUrl);
  },

  onNicknameBlur(e) {
    const nickname = e.detail.value || '专注岛用户';
    this.setData({ nickname, isEditingNickname: false });
    wx.setStorageSync('userNickname', nickname);
  },

  editNickname() {
    this.setData({ isEditingNickname: true });
  },

  loadData() {
    const sessions = storage.getSessions();
    let totalDuration = 0;
    sessions.forEach(s => totalDuration += s.duration);
    
    this.setData({
      totalDurationH: (totalDuration / 3600).toFixed(1),
      totalCount: sessions.length
    });
  },

  goToHistory() {
    wx.navigateTo({ url: '/pages/history/index' });
  },

  goToReminder() {
    wx.navigateTo({ url: '/pages/settings-reminder/index' });
  },

  goToBackup() {
    wx.navigateTo({ url: '/pages/settings-backup/index' });
  },

  goToHelp() {
    wx.navigateTo({ url: '/pages/help/index' });
  },

  goToAbout() {
    wx.navigateTo({ url: '/pages/about/index' });
  }
});