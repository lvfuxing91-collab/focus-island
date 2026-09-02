const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()

  try {
    // 1. 检查搭子数量
    const countRes = await db.collection('buddies').where(
      _.or([
        { userA: OPENID },
        { userB: OPENID }
      ])
    ).count()

    if (countRes.total >= 10) {
      return { success: false, message: '搭子数量已达上限（10人）' }
    }

    // 2. 生成邀请记录
    const inviteRes = await db.collection('invites').add({
      data: {
        senderId: OPENID,
        status: 'pending',
        createdAt: db.serverDate()
      }
    })

    return { 
      success: true, 
      data: { inviteId: inviteRes._id } 
    }
  } catch (e) {
    console.error(e)
    return { success: false, message: '生成邀请失败，请确保已创建 invites 和 buddies 集合' }
  }
}
