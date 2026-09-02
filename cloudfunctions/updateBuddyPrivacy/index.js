const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { showFocusItem } = event

  try {
    await db.collection('users').doc(OPENID).update({
      data: {
        'privacy.showFocusItem': showFocusItem,
        updatedAt: db.serverDate()
      }
    })

    return { success: true, data: {} }
  } catch (e) {
    return { success: false, message: e.message }
  }
}
