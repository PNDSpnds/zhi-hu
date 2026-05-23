const cloud = require('wx-server-sdk');
cloud.init();
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { postId, content } = event;

  if (!postId || !content || !content.trim()) {
    return { success: false, message: '参数不完整' };
  }

  // 内容长度限制
  if (content.length > 500) {
    return { success: false, message: '评论内容不能超过500字' };
  }

  // 获取用户信息
  const usersCol = db.collection('users');
  const { data: users } = await usersCol.where({ openid }).get();

  let nickName = '匿名';
  let avatarUrl = '👤';

  if (users.length > 0) {
    nickName = users[0].nickName;
    avatarUrl = users[0].avatarUrl;
  }

  const commentsCol = db.collection('comments');
  const result = await commentsCol.add({
    data: {
      postId,
      content: content.trim(),
      openid,
      nickName,
      avatarUrl,
      createdAt: db.serverDate()
    }
  });

  return {
    success: true,
    comment: {
      _id: result._id,
      postId,
      content: content.trim(),
      openid,
      nickName,
      avatarUrl,
      createdAt: Date.now()
    }
  };
};
