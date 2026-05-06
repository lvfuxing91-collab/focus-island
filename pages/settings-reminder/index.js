Page({
  data: {
    reminderType: 'vibrate'
  },

  onLoad() {
    const type = wx.getStorageSync('reminder_setting') || 'vibrate';
    this.setData({ reminderType: type });
  },

  onChange(event) {
    this.setReminder(event.detail);
  },

  onClick(event) {
    const { name } = event.currentTarget.dataset;
    this.setReminder(name);
  },

  setReminder(type) {
    this.setData({ reminderType: type });
    wx.setStorageSync('reminder_setting', type);
    
    if (type === 'vibrate') {
      try {
        wx.vibrateShort();
      } catch(e) {}
    } else if (type === 'sound') {
      wx.showToast({ title: '已开启声音提醒', icon: 'none' });
    }
  }
});