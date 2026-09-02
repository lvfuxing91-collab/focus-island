const { callFunction } = require('../../utils/cloud.js');
import Dialog from '@vant/weapp/dialog/dialog';
import Toast from '@vant/weapp/toast/toast';

Page({
  data: {
    totalDurationH: '0.0',
    totalCount: 0,
    avatarUrl: '',
    nickname: '',
    isEditingNickname: false,
    showFocusItem: false
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
    this.checkPendingInvite();
  },

  checkPendingInvite() {
    const app = getApp();
    if (app.globalData.pendingInviteId) {
      const inviteId = app.globalData.pendingInviteId;
      app.globalData.pendingInviteId = null;

      Dialog.confirm({
        title: '搭子邀请',
        message: '有专注岛民邀请你成为搭子，是否接受？',
      }).then(async () => {
        Toast.loading({ message: '正在处理...', forbidClick: true });
        try {
          await callFunction('acceptInvite', { inviteId });
          Toast.success('添加成功');
        } catch (e) {
          Toast.fail(e.message || '接受失败');
        }
      }).catch(() => {});
    }
  },

  async onPrivacyChange(e) {
    const checked = e.detail;
    this.setData({ showFocusItem: checked });
    try {
      await callFunction('updateBuddyPrivacy', { showFocusItem: checked });
    } catch (e) {
      Toast.fail('设置失败');
      this.setData({ showFocusItem: !checked });
    }
  },

  async onAddBuddy() {
    Toast.loading({ message: '正在生成邀请...', forbidClick: true });
    try {
      const res = await callFunction('generateInvite');
      this.setData({ lastInviteId: res.data.inviteId });
      // 提示用户点击右上角分享
      Dialog.alert({
        title: '邀请码已生成',
        message: '请点击右上角【...】菜单选择【发送给朋友】，即可发送邀请。',
      });
    } catch (e) {
      Toast.fail(e.message || '生成失败');
    }
  },

  onShareAppMessage() {
    const nickname = this.data.nickname || '专注岛民';
    const inviteId = this.data.lastInviteId;
    
    if (inviteId) {
      return {
        title: `我是${nickname}，邀请你加入专注岛，一起成为专注搭子！`,
        path: `/pages/index/index?inviteId=${inviteId}`,
        imageUrl: '/assets/icons/tab_focus.png'
      };
    }
    
    return {
      title: '专注岛 - 极简专注工具',
      path: '/pages/index/index',
      imageUrl: '/assets/icons/tab_focus.png'
    };
  },

  goToRank() {
    wx.navigateTo({ url: '/pages/rank/index' });
  },

  async initUserInfo() {
    const avatarUrl = wx.getStorageSync('userAvatar') || '';
    const nickname = wx.getStorageSync('userNickname') || '专注岛用户';
    this.setData({ avatarUrl, nickname });

    // 从云端同步最新的隐私设置
    try {
      const db = wx.cloud.database();
      const res = await db.collection('users').doc(wx.getStorageSync('openid')).get();
      if (res.data && res.data.privacy) {
        this.setData({ showFocusItem: !!res.data.privacy.showFocusItem });
      }
    } catch (e) {
      console.error('获取云端隐私设置失败', e);
    }
  },

  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    this.setData({ avatarUrl });
    wx.setStorageSync('userAvatar', avatarUrl);
    this.syncUserToCloud();
  },

  onNicknameBlur(e) {
    const nickname = e.detail.value || '专注岛用户';
    this.setData({ nickname, isEditingNickname: false });
    wx.setStorageSync('userNickname', nickname);
    this.syncUserToCloud();
  },

  editNickname() {
    this.setData({ isEditingNickname: true });
  },

  loadData() {
    const storage = require('../../utils/storage.js');
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