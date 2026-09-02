/**
 * 调用云函数封装
 * @param {string} name 云函数名称
 * @param {object} data 传递的数据
 * @returns {Promise}
 */
const callFunction = (name, data = {}) => {
  return wx.cloud.callFunction({
    name,
    data
  }).then(res => {
    if (res.result && res.result.success) {
      return res.result;
    } else {
      throw new Error(res.result ? res.result.message : '请求失败');
    }
  }).catch(err => {
    console.error(`[CloudFunction] ${name} 调用失败:`, err);
    throw err;
  });
};

module.exports = {
  callFunction
};
