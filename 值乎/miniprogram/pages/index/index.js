// pages/index/index.js — Community Feed
const app = getApp();
const db = wx.cloud.database();

Page({
  data: {
    posts: [],
    leftPosts: [],
    rightPosts: [],
    loading: true,
    loadingMore: false,
    allLoaded: false,
    pageSize: 20,
    lastDoc: null
  },

  onLoad() {
    this.loadPosts();
  },

  onShow() {
    // Refresh posts when tab becomes visible (e.g. after publishing)
    if (this.data.posts.length > 0) {
      this.setData({ posts: [], leftPosts: [], rightPosts: [], lastDoc: null, allLoaded: false });
      this.loadPosts();
    }
  },

  /** Pull-to-refresh */
  onPullDownRefresh() {
    this.setData({ posts: [], leftPosts: [], rightPosts: [], lastDoc: null, allLoaded: false });
    this.loadPosts().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  /** Load more on scroll to bottom */
  onReachBottom() {
    if (this.data.loadingMore || this.data.allLoaded) return;
    this.loadMorePosts();
  },

  /** Initial load */
  async loadPosts() {
    this.setData({ loading: true });
    try {
      const res = await db.collection('posts')
        .orderBy('createdAt', 'desc')
        .limit(this.data.pageSize)
        .get();

      const posts = res.data || [];
      this.setData({
        posts,
        lastDoc: posts.length === this.data.pageSize ? posts[posts.length - 1].createdAt : null,
        allLoaded: posts.length < this.data.pageSize,
        loading: false
      });
      this.distributePosts();
    } catch (err) {
      console.error('加载帖子失败:', err);
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败，请重试', icon: 'none' });
    }
  },

  /** Load more (cursor-based pagination) */
  async loadMorePosts() {
    if (this.data.loadingMore) return;
    this.setData({ loadingMore: true });

    try {
      let query = db.collection('posts')
        .orderBy('createdAt', 'desc')
        .limit(this.data.pageSize);

      // Cursor-based: use the last createdAt as cursor
      if (this.data.lastDoc) {
        query = query.where({
          createdAt: db.command.lt(this.data.lastDoc)
        });
      }

      const res = await query.get();
      const newPosts = res.data || [];

      if (newPosts.length === 0) {
        this.setData({ allLoaded: true, loadingMore: false });
        return;
      }

      const allPosts = this.data.posts.concat(newPosts);
      this.setData({
        posts: allPosts,
        lastDoc: newPosts.length === this.data.pageSize ? newPosts[newPosts.length - 1].createdAt : null,
        allLoaded: newPosts.length < this.data.pageSize,
        loadingMore: false
      });
      this.distributePosts();
    } catch (err) {
      console.error('加载更多失败:', err);
      this.setData({ loadingMore: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  /** Distribute posts into left/right columns for waterfall layout */
  distributePosts() {
    const posts = this.data.posts;
    const leftPosts = [];
    const rightPosts = [];

    posts.forEach((post, index) => {
      // Alternate: even indices go left, odd go right
      if (index % 2 === 0) {
        leftPosts.push(post);
      } else {
        rightPosts.push(post);
      }
    });

    this.setData({ leftPosts, rightPosts });
  },

  /** Navigate to post detail */
  onCardTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: '../detail/detail?id=' + id
    });
  }
});
