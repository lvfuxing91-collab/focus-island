const app = getApp();

Component({
  data: {
    isRunning: false,
    isPaused: false,
    displayTime: '00:00'
  },

  lifetimes: {
    attached() {
      this.updateState();
      this.timer = setInterval(() => {
        this.updateState();
      }, 1000);
    },
    detached() {
      if (this.timer) clearInterval(this.timer);
    }
  },

  methods: {
    updateState() {
      const state = app.globalData.timerState;
      const pages = getCurrentPages();
      const currentPage = pages[pages.length - 1];
      
      // Don't show on timer page
      const isTimerPage = currentPage && currentPage.route.includes('pages/timer/index');
      
      if (state.isRunning && !isTimerPage) {
        this.setData({
          isRunning: true,
          isPaused: state.isPaused,
          displayTime: state.displayTime
        });
      } else {
        this.setData({ isRunning: false });
      }
    },
    goBack() {
      wx.navigateTo({
        url: '/pages/timer/index'
      });
    }
  }
});