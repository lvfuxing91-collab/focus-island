const MAX_SESSIONS = 1000;

const getSessions = () => {
  return wx.getStorageSync('focus_sessions') || [];
};

const saveSession = (session) => {
  const sessions = getSessions();
  sessions.unshift(session);
  if (sessions.length > MAX_SESSIONS) {
    sessions.pop(); // Remove the oldest
  }
  
  try {
    wx.setStorageSync('focus_sessions', sessions);
    return true;
  } catch (e) {
    // Handling storage limit
    wx.showToast({
      title: '本地空间已满，建议清理历史记录',
      icon: 'none',
      duration: 3000
    });
    // Try saving minimal data
    const shortSession = {
      id: session.id,
      mode: session.mode,
      duration: session.duration,
      createdAt: session.createdAt
    };
    sessions[0] = shortSession;
    try {
      wx.setStorageSync('focus_sessions', sessions);
    } catch (err) {
      console.error('Storage totally full');
    }
    return false;
  }
};

const getTags = () => {
  return wx.getStorageSync('tags') || [];
};

const saveTags = (tags) => {
  wx.setStorageSync('tags', tags);
};

const updateSession = (sessionId, updatedFields) => {
  const sessions = getSessions();
  const index = sessions.findIndex(s => s.id === sessionId);
  if (index !== -1) {
    sessions[index] = { ...sessions[index], ...updatedFields };
    wx.setStorageSync('focus_sessions', sessions);
  }
};

module.exports = {
  getSessions,
  saveSession,
  getTags,
  saveTags,
  updateSession
};