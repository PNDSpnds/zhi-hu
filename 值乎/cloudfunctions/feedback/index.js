const cloud = require('wx-server-sdk');
cloud.init();
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { postId, didBuy } = event; // didBuy: true = 买了, false = 没买

  if (!postId || didBuy === undefined) {
    return { success: false, message: '参数不完整' };
  }

  // 验证是否是帖子作者
  const postsCol = db.collection('posts');
  const { data: post } = await postsCol.doc(postId).get();

  if (!post) {
    return { success: false, message: '帖子不存在' };
  }

  // 校验作者身份：兼容 _openid（系统自动字段）和 authorId（显式字段）
  const postOwnerId = post._openid || post.authorId;
  if (postOwnerId !== openid) {
    return { success: false, message: '只有帖子作者可以更新回馈' };
  }

  // 检查是否已经有回馈记录
  const feedbackCol = db.collection('feedback');
  const { data: existing } = await feedbackCol.where({
    postId,
    openid
  }).get();

  if (existing.length > 0) {
    // 更新已有记录
    await feedbackCol.doc(existing[0]._id).update({
      data: {
        didBuy,
        updatedAt: db.serverDate()
      }
    });
  } else {
    // 创建新记录
    await feedbackCol.add({
      data: {
        postId,
        openid,
        didBuy,
        createdAt: db.serverDate()
      }
    });
  }

  // 更新帖子标记
  await postsCol.doc(postId).update({
    data: {
      hasFeedback: true,
      didBuy
    }
  });

  return {
    success: true,
    didBuy
  };
};
