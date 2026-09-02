const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { dimension } = event // 'week' | 'month' | 'total'

  try {
    // 1. 获取所有搭子 ID + 自己
    const buddiesRes = await db.collection('buddies').where(
      _.or([{ userA: OPENID }, { userB: OPENID }])
    ).get()

    const ids = buddiesRes.data.map(b => b.userA === OPENID ? b.userB : b.userA)
    ids.push(OPENID)

    // 2. 获取这些用户的统计数据
    const usersRes = await db.collection('users').where({
      _id: _.in(ids)
    }).get()

    const rankList = usersRes.data.map(user => ({
      id: user._id,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      duration: user.stats[dimension] || 0
    }))

    // 3. 排序
    rankList.sort((a, b) => b.duration - a.duration)

    return { success: true, data: rankList }
  } catch (e) {
    return { success: false, message: e.message }
  }
}
