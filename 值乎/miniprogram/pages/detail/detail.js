// pages/detail/detail.js — Post Detail Page
const app = getApp();
const db = wx.cloud.database();

Page({
  data: {
    postId: '',
    post: null,
    comments: [],
    loading: true,
    hasVoted: false,
    isAuthor: false,

    // Comment input
    commentText: '',
    sendingComment: false
  },

  onLoad(options) {
    const postId = options.id;
    if (!postId) {
      wx.showToast({ title: '缺少帖子ID', icon: 'none' });
      wx.navigateBack();
      return;
    }

    this.setData({ postId });
    this.loadPost(postId);
    this.loadComments(postId);
    this.checkUserVote(postId);
  },

  /** Format a Date or timestamp into relative or absolute text */
  formatTime(dateVal) {
    if (!dateVal) return '';
    const date = new Date(dateVal);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
    if (diff < 604800000) return Math.floor(diff / 86400000) + '天前';

    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  },

  /** Load post by _id */
  async loadPost(postId) {
    try {
      const res = await db.collection('posts').doc(postId).get();
      if (!res.data) {
        this.setData({ loading: false });
        return;
      }

      const post = res.data;
      post.createdAtText = this.formatTime(post.createdAt);

      // 判断当前用户是否是作者
      const openid = await app.getOpenid();
      const postOwnerId = post._openid || post.authorId;
      const isAuthor = openid && postOwnerId === openid;

      this.setData({ post, isAuthor, loading: false });
    } catch (err) {
      console.error('加载帖子失败:', err);
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  /** Load comments for this post */
  async loadComments(postId) {
    try {
      const res = await db.collection('comments')
        .where({ postId })
        .orderBy('createdAt', 'asc')
        .get();

      const comments = (res.data || []).map(c => ({
        ...c,
        createdAtText: this.formatTime(c.createdAt)
      }));

      this.setData({ comments });
    } catch (err) {
      console.error('加载评论失败:', err);
    }
  },

  /** Check if current user has already voted on this post */
  async checkUserVote(postId) {
    try {
      const openid = await app.getOpenid();
      if (!openid) return;

      const res = await db.collection('votes')
        .where({
          postId,
          openid
        })
        .limit(1)
        .get();

      if (res.data && res.data.length > 0) {
        this.setData({ hasVoted: true });
      }
    } catch (err) {
      console.error('检查投票状态失败:', err);
    }
  },

  /** Vote: 'value' or 'notValue' */
  async onVote(e) {
    const type = e.currentTarget.dataset.type;
    const { post, hasVoted, postId } = this.data;

    if (hasVoted) {
      wx.showToast({ title: '你已经投过票了', icon: 'none' });
      return;
    }

    try {
      const openid = await app.getOpenid();
      if (!openid) {
        wx.showToast({ title: '请先登录', icon: 'none' });
        return;
      }

      wx.showLoading({ title: '投票中...' });

      // Call vote cloud function
      const res = await wx.cloud.callFunction({
        name: 'vote',
        data: {
          postId,
          voteType: type,
          userId: openid
        }
      });

      wx.hideLoading();

      if (res.result && res.result.success) {
        // Update local counts
        const updatedPost = { ...post };
        if (type === 'value') {
          updatedPost.valueCount = (post.valueCount || 0) + 1;
        } else {
          updatedPost.notValueCount = (post.notValueCount || 0) + 1;
        }

        this.setData({
          post: updatedPost,
          hasVoted: true
        });

        wx.showToast({ title: '投票成功', icon: 'success' });
      } else {
        wx.showToast({ title: res.result?.message || '投票失败', icon: 'none' });
      }
    } catch (err) {
      wx.hideLoading();
      console.error('投票失败:', err);
      wx.showToast({ title: '投票失败，请重试', icon: 'none' });
    }
  },

  /** Preview post image */
  onPreviewImage() {
    if (this.data.post && this.data.post.imageUrl) {
      wx.previewImage({
        urls: [this.data.post.imageUrl],
        current: this.data.post.imageUrl
      });
    }
  },

  /** Comment input */
  onCommentInput(e) {
    this.setData({ commentText: e.detail.value });
  },

  /** Send comment */
  async onSendComment() {
    const { commentText, postId, sendingComment } = this.data;

    if (sendingComment) return;
    if (!commentText || !commentText.trim()) {
      wx.showToast({ title: '请输入评论内容', icon: 'none' });
      return;
    }

    this.setData({ sendingComment: true });

    try {
      const openid = await app.getOpenid();
      if (!openid) {
        wx.showToast({ title: '请先登录', icon: 'none' });
        this.setData({ sendingComment: false });
        return;
      }

      const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo') || {};
      const avatarUrl = userInfo.avatarUrl || '../../images/default-avatar.png';
      const nickName = userInfo.nickName || '微信用户';

      const commentData = {
        postId,
        content: commentText.trim(),
        openid,
        avatarUrl,
        nickName,
        createdAt: new Date()
      };

      // Save comment to database
      const res = await db.collection('comments').add({ data: commentData });

      // Optimistic UI update: append the new comment locally
      const newComment = {
        _id: res._id,
        ...commentData,
        createdAtText: this.formatTime(commentData.createdAt)
      };

      const comments = [...this.data.comments, newComment];

      this.setData({
        comments,
        commentText: '',
        sendingComment: false
      });

      wx.showToast({ title: '评论成功', icon: 'success' });

    } catch (err) {
      console.error('评论失败:', err);
      this.setData({ sendingComment: false });
      wx.showToast({ title: '评论失败，请重试', icon: 'none' });
    }
  },

  /** Share */
  onShareAppMessage() {
    const { post, postId } = this.data;
    const itemName = post ? post.itemName : '';
    const score = post ? post.score : '';
    return {
      title: itemName
        ? `「${itemName}」值得指数 ${score} 分，你觉得值不值？`
        : '来看看这条评测，你觉得值不值？',
      path: `/pages/detail/detail?id=${postId}`
    };
  },

  /** Delete post (author only) */
  async onDeletePost() {
    const { post, postId } = this.data;
    if (!post) return;

    const openid = await app.getOpenid();
    const postOwnerId = post._openid || post.authorId;
    if (postOwnerId !== openid) {
      wx.showToast({ title: '只有作者可以删除', icon: 'none' });
      return;
    }

    wx.showModal({
      title: '确认删除',
      content: '删除后不可恢复，确定要删除这条帖子吗？',
      confirmColor: '#E8636C',
      success: async (res) => {
        if (!res.confirm) return;

        wx.showLoading({ title: '删除中...' });
        try {
          const result = await wx.cloud.callFunction({
            name: 'deletePost',
            data: { postId }
          });

          wx.hideLoading();

          if (result.result && result.result.success) {
            wx.showToast({ title: '已删除', icon: 'success' });
            setTimeout(() => {
              wx.navigateBack({
                fail() {
                  wx.switchTab({ url: '../index/index' });
                }
              });
            }, 1500);
          } else {
            wx.showToast({ title: result.result?.message || '删除失败', icon: 'none' });
          }
        } catch (err) {
          wx.hideLoading();
          console.error('删除帖子失败:', err);
          const msg = err.errMsg || err.message || '删除失败';
          wx.showToast({ title: msg, icon: 'none', duration: 3000 });
        }
      }
    });
  }
});
