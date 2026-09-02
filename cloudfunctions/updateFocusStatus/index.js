const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { action, profile, isFocusing, currentFocusItem, focusStartTime, duration } = event

  try {
    // 确保用户存在
    const userResult = await db.collection('users').doc(OPENID).get().catch(() => null)
    
    if (!userResult) {
      await db.collection('users').doc(OPENID).set({
        data: {
          nickname: '专注岛用户',
          avatarUrl: '',
          isFocusing: false,
          focusStartTime: null,
          currentFocusItem: '',
          privacy: { showFocusItem: false },
          stats: { total: 0, week: 0, month: 0, lastUpdate: db.serverDate() },
          updatedAt: db.serverDate()
        }
      })
    }

    if (action === 'syncProfile') {
      await db.collection('users').doc(OPENID).update({
        data: {
          nickname: profile.nickname,
          avatarUrl: profile.avatarUrl,
          updatedAt: db.serverDate()
        }
      })
    } else if (action === 'addDuration') {
      // 更新时长统计
      const now = new Date()
      // 这里简化逻辑，直接累加。实际生产中可能需要判断周/月重置
      await db.collection('users').doc(OPENID).update({
        data: {
          'stats.total': _.inc(duration),
          'stats.week': _.inc(duration),
          'stats.month': _.inc(duration),
          'stats.lastUpdate': db.serverDate(),
          updatedAt: db.serverDate()
        }
      })
    } else {
      // 更新专注状态
      await db.collection('users').doc(OPENID).update({
        data: {
          isFocusing,
          currentFocusItem: currentFocusItem || '',
          focusStartTime: focusStartTime || null,
          updatedAt: db.serverDate()
        }
      })
    }

    return { success: true, data: {}, openid: OPENID }
  } catch (e) {
    return { success: false, message: e.message }
  }
}
