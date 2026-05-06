Component({
  data: {
    active: 0,
    list: [
      { url: "/pages/index/index" },
      { url: "/pages/stats/index" },
      { url: "/pages/profile/index" }
    ]
  },
  methods: {
    onChange(event) {
      const index = event.detail;
      const app = getApp();
      
      if (index === 0 && app.globalData.timerState && app.globalData.timerState.isRunning) {
        const pages = getCurrentPages();
        const currentPage = pages[pages.length - 1];
        if (currentPage && currentPage.route.includes('pages/timer/index')) {
          // Already on timer page, do nothing
          return;
        }
        // Not on timer page, navigate to it
        wx.navigateTo({
          url: '/pages/timer/index'
        });
        return;
      }

      this.setData({ active: index });
      wx.switchTab({
        url: this.data.list[index].url
      });
    },
    init() {
      const page = getCurrentPages().pop();
      const route = page ? page.route : '';
      if (route.includes('pages/timer/index')) {
        this.setData({ active: 0 });
        return;
      }
      const active = this.data.list.findIndex(item => item.url === `/${route}` || item.url === route);
      this.setData({ active });
    }
  }
});