const cloud = require('wx-server-sdk');
cloud.init();
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const usersCol = db.collection('users');

  // 用 _openid 查询（miniprogram 端创建的记录会自动设 _openid）
  let { data } = await usersCol.where({ _openid: openid }).get();

  // 如果查不到（可能是云函数创建的旧记录），用显式 openid 字段查一次
  if (data.length === 0) {
    const res = await usersCol.where({ openid }).get();
    data = res.data;
  }

  // 用户不存在：返回默认资料，不做写入（由 miniprogram 端 profile 页创建）
  if (data.length === 0) {
    const defaultAvatars = ['🐱', '🐶', '🐼', '🐨', '🐰', '🦊', '🐸', '🐵', '🐮', '🐷', '🐭', '🐹', '🐔', '🐧', '🐦', '🐤', '🦄', '🐌', '🐛', '🦋'];
    const randomAvatar = defaultAvatars[Math.floor(Math.random() * defaultAvatars.length)];
    const randomNick = '值友' + String(Math.floor(Math.random() * 9000) + 1000);

    return {
      openid,
      isNew: true,
      userInfo: {
        nickName: randomNick,
        avatarUrl: randomAvatar,
        weightPreset: 'pragmatic',
        customWeights: null
      }
    };
  }

  // 老用户
  const user = data[0];
  return {
    openid,
    isNew: false,
    userInfo: {
      nickName: user.nickName,
      avatarUrl: user.avatarUrl,
      weightPreset: user.weightPreset || 'pragmatic',
      customWeights: user.customWeights || null
    }
  };
};
