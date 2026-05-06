const { formatTime, formatDuration } = require('../../utils/util.js');

Page({
  exportData() {
    const sessions = wx.getStorageSync('focus_sessions') || [];
    if (sessions.length === 0) {
      wx.showToast({ title: '暂无数据可导出', icon: 'none' });
      return;
    }
    
    const text = sessions.map(s => {
      const date = formatTime(new Date(s.createdAt));
      const dur = formatDuration(s.duration);
      const items = s.items.map(i => i.content).join(', ');
      return `[${date}] 模式:${s.mode === 'pomodoro' ? '番茄钟' : '自由'} 时长:${dur} 事项:${items || '无'}`;
    }).join('\n');
    
    wx.setClipboardData({
      data: text,
      success: () => {
        wx.showToast({ title: '已复制到剪贴板' });
      }
    });
  },

  clearAllData() {
    wx.showModal({
      title: '危险操作',
      content: '确定要清除所有专注记录和设置吗？此操作不可恢复。',
      confirmColor: '#E74C3C',
      success: (res) => {
        if (res.confirm) {
          const avatar = wx.getStorageSync('userAvatar');
          const nickname = wx.getStorageSync('userNickname');
          
          wx.clearStorageSync();
          
          if (avatar) wx.setStorageSync('userAvatar', avatar);
          if (nickname) wx.setStorageSync('userNickname', nickname);
          
          getApp().initTags();
          wx.showToast({ title: '数据已清除' });
        }
      }
    });
  }
});