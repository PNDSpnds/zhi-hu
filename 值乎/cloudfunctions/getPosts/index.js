const cloud = require('wx-server-sdk');
cloud.init();
const db = cloud.database();

exports.main = async (event, context) => {
  const { page = 1, pageSize = 20, filter } = event;
  const skip = (page - 1) * pageSize;

  const postsCol = db.collection('posts');

  // 基础查询：按时间倒序
  let query = postsCol.orderBy('createdAt', 'desc');

  // 可选的筛选条件
  if (filter === 'hot') {
    // 按总投票数排序（热度）
    query = postsCol.orderBy('valueCount', 'desc').orderBy('notValueCount', 'desc');
  }

  const { data: posts } = await query
    .skip(skip)
    .limit(pageSize)
    .get();

  // 为每个帖子检查当前用户是否已投票
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const votesCol = db.collection('votes');

  const postsWithUserVote = await Promise.all(posts.map(async post => {
    const { data: userVotes } = await votesCol.where({
      postId: post._id,
      openid
    }).get();

    return {
      ...post,
      userVoted: userVotes.length > 0,
      userVoteType: userVotes.length > 0 ? userVotes[0].voteType : null
    };
  }));

  return {
    success: true,
    posts: postsWithUserVote,
    hasMore: posts.length === pageSize
  };
};
