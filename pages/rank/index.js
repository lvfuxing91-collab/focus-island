const { callFunction } = require('../../utils/cloud.js');
import Toast from '@vant/weapp/toast/toast';

Page({
  data: {
    activeTab: 'week',
    rankList: [],
    myRank: null,
    loading: false
  },

  onLoad() {
    this.loadRank();
  },

  onTabChange(e) {
    this.setData({ activeTab: e.detail.name }, () => {
      this.loadRank();
    });
  },

  async loadRank() {
    this.setData({ loading: true });
    Toast.loading({ message: '加载中...', forbidClick: true });

    try {
      const res = await callFunction('getRank', { dimension: this.data.activeTab });
      const myOpenid = wx.getStorageSync('openid') || ''; // 这里需要确保本地存了openid，或者在app.js里获取
      
      const rankList = res.data.map((item, index) => {
        const isSelf = item.id === myOpenid;
        const durationText = this.formatDurationText(item.duration);
        return { ...item, index, isSelf, durationText };
      });

      const myRank = rankList.find(item => item.isSelf);

      this.setData({
        rankList,
        myRank,
        loading: false
      });
      Toast.clear();
    } catch (e) {
      console.error(e);
      this.setData({ loading: false });
      Toast.fail(e.message || '加载失败');
    }
  },

  formatDurationText(seconds) {
    if (!seconds) return '0分';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h${m}m` : `${m}m`;
  }
});
