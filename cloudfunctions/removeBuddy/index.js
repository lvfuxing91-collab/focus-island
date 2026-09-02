const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { buddyId } = event

  try {
    // 1. 删除关系
    await db.collection('buddies').where(
      _.or([
        { userA: OPENID, userB: buddyId },
        { userA: buddyId, userB: OPENID }
      ])
    ).remove()

    // 2. 发送系统通知给对方
    const userRes = await db.collection('users').doc(OPENID).get()
    const nickname = userRes.data.nickname || '专注岛民'
    
    await db.collection('notifications').add({
      data: {
        recipientId: buddyId,
        content: `你的搭子 ${nickname} 解除了搭子关系`,
        type: 'system',
        isRead: false,
        createdAt: db.serverDate()
      }
    })

    return { success: true, data: {} }
  } catch (e) {
    return { success: false, message: e.message }
  }
}
