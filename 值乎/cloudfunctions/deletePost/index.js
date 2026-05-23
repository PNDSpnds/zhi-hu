const cloud = require('wx-server-sdk');
cloud.init();
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { postId } = event;

  if (!postId) {
    return { success: false, message: '参数不完整' };
  }

  const postsCol = db.collection('posts');

  // 验证帖子存在和所有权
  let post;
  try {
    const { data } = await postsCol.doc(postId).get();
    post = data;
  } catch (e) {
    return { success: false, message: '帖子不存在' };
  }

  if (!post) {
    return { success: false, message: '帖子不存在' };
  }

  const postOwnerId = post._openid || post.authorId;
  if (postOwnerId !== openid) {
    return { success: false, message: '只有帖子作者可以删除' };
  }

  // 删除关联的投票
  try {
    await db.collection('votes').where({ postId }).remove();
  } catch (e) { /* ignore */ }

  // 删除关联的评论
  try {
    await db.collection('comments').where({ postId }).remove();
  } catch (e) { /* ignore */ }

  // 删除关联的回馈
  try {
    await db.collection('feedback').where({ postId }).remove();
  } catch (e) { /* ignore */ }

  // 删除帖子本身
  await postsCol.doc(postId).remove();

  return { success: true };
};
