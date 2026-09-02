const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { inviteId } = event

  try {
    // 1. 获取邀请记录
    const inviteRes = await db.collection('invites').doc(inviteId).get().catch(() => null)
    if (!inviteRes) {
      return { success: false, message: '邀请链接不存在或已过期' }
    }
    const invite = inviteRes.data

    if (invite.status !== 'pending') {
      return { success: false, message: '邀请链接已失效' }
    }
    if (invite.senderId === OPENID) {
      return { success: false, message: '不能添加自己为搭子' }
    }

    // 2. 检查是否已是搭子
    const existingRes = await db.collection('buddies').where(
      _.or([
        { userA: OPENID, userB: invite.senderId },
        { userA: invite.senderId, userB: OPENID }
      ])
    ).get()

    if (existingRes.data.length > 0) {
      return { success: false, message: '你们已经是搭子了' }
    }

    // 3. 检查双方搭子上限
    const checkLimit = async (id) => {
      const res = await db.collection('buddies').where(_.or([{ userA: id }, { userB: id }])).count()
      return res.total >= 10
    }

    if (await checkLimit(OPENID)) {
      return { success: false, message: '你的搭子数量已达上限' }
    }
    if (await checkLimit(invite.senderId)) {
      return { success: false, message: '对方的搭子数量已达上限' }
    }

    // 4. 建立关系
    await db.collection('buddies').add({
      data: {
        userA: OPENID < invite.senderId ? OPENID : invite.senderId,
        userB: OPENID < invite.senderId ? invite.senderId : OPENID,
        createdAt: db.serverDate()
      }
    })

    // 5. 更新邀请状态
    await db.collection('invites').doc(inviteId).update({
      data: { status: 'accepted' }
    })

    return { success: true, data: { senderId: invite.senderId } }
  } catch (e) {
    console.error(e)
    return { success: false, message: e.message || '接受邀请失败' }
  }
}
