const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()

  try {
    // 1. 获取所有搭子 ID
    const buddiesRes = await db.collection('buddies').where(
      _.or([{ userA: OPENID }, { userB: OPENID }])
    ).get()

    const buddyIds = buddiesRes.data.map(b => b.userA === OPENID ? b.userB : b.userA)

    if (buddyIds.length === 0) {
      return { success: true, data: [] }
    }

    // 2. 批量获取搭子信息
    const usersRes = await db.collection('users').where({
      _id: _.in(buddyIds)
    }).get()

    const buddyList = usersRes.data.map(user => {
      const info = {
        id: user._id,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
        isFocusing: user.isFocusing,
        focusStartTime: user.focusStartTime,
        todayDuration: user.stats.week, // 简化：返回周时长或今日时长。这里根据实际集合结构调整
      }
      
      // 如果权限开启，返回当前专注事项
      if (user.privacy && user.privacy.showFocusItem) {
        info.currentFocusItem = user.currentFocusItem
      }
      
      return info
    })

    return { success: true, data: buddyList }
  } catch (e) {
    return { success: false, message: e.message }
  }
}
