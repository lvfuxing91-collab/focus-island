const { formatDuration } = require('../../utils/util.js');
const { callFunction } = require('../../utils/cloud.js');
import Dialog from '@vant/weapp/dialog/dialog';
import Toast from '@vant/weapp/toast/toast';

Page({
  data: {
    buddies: [],
    loading: false,
    refreshing: false
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().init();
    }
    this.loadBuddies();
  },

  onPullDownRefresh() {
    this.loadBuddies(true);
  },

  async loadBuddies(isRefresh = false) {
    if (this.data.loading) return;
    
    if (!isRefresh) {
      this.setData({ loading: true });
    }

    try {
      const res = await callFunction('getBuddyList');
      const buddies = res.data.map(b => ({
        ...b,
        durationFormatted: this.formatDurationText(b.todayDuration)
      }));
      
      this.setData({ buddies, loading: false });
      if (isRefresh) {
        wx.stopPullDownRefresh();
      }
    } catch (e) {
      console.error(e);
      this.setData({ loading: false });
      if (isRefresh) {
        wx.stopPullDownRefresh();
      }
      Toast.fail(e.message || '加载失败');
    }
  },

  formatDurationText(seconds) {
    if (!seconds) return '0分钟';
    if (seconds < 60) return '不到1分钟';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}小时${m}分` : `${m}分钟`;
  },

  onLongPress(e) {
    const { id, name } = e.currentTarget.dataset;
    Dialog.confirm({
      title: '解除搭子关系',
      message: `确定要解除与 ${name} 的搭子关系吗？`,
    }).then(async () => {
      Toast.loading({ message: '正在处理...', forbidClick: true });
      try {
        await callFunction('removeBuddy', { buddyId: id });
        Toast.success('已解除');
        this.loadBuddies();
      } catch (e) {
        Toast.fail(e.message || '解除失败');
      }
    }).catch(() => {});
  },

  goToRank() {
    wx.navigateTo({ url: '/pages/rank/index' });
  },

  goToInvite() {
    wx.switchTab({ url: '/pages/profile/index' });
  }
});
