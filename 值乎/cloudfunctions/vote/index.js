const cloud = require('wx-server-sdk');
cloud.init();
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { postId, voteType } = event; // voteType: 'value' | 'notValue'

  if (!postId || !voteType) {
    return { success: false, message: '参数不完整' };
  }

  if (voteType !== 'value' && voteType !== 'notValue') {
    return { success: false, message: '投票类型无效' };
  }

  const votesCol = db.collection('votes');

  // 检查是否已投过票
  const { data: existing } = await votesCol.where({
    postId,
    openid
  }).get();

  if (existing.length > 0) {
    return { success: false, message: '你已经投过票了' };
  }

  // 记录投票
  await votesCol.add({
    data: {
      postId,
      openid,
      voteType,
      createdAt: db.serverDate()
    }
  });

  // 更新帖子的投票计数
  const postsCol = db.collection('posts');
  const field = voteType === 'value' ? 'valueCount' : 'notValueCount';

  await postsCol.doc(postId).update({
    data: {
      [field]: db.command.inc(1)
    }
  });

  // 获取更新后的计数
  const { data: post } = await postsCol.doc(postId).get();
  const updatedPost = post;

  return {
    success: true,
    valueCount: updatedPost.valueCount || 0,
    notValueCount: updatedPost.notValueCount || 0
  };
};
