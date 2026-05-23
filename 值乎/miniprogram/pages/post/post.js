// pages/post/post.js — Create Post / Publish to Community
const app = getApp();
const db = wx.cloud.database();

Page({
  data: {
    // Evaluation result from storage
    evaluationResult: null,

    // Form fields
    itemName: '',
    description: '',
    imageUrl: '',
    isAnonymous: false,

    // UI state
    uploading: false,
    submitting: false
  },

  onLoad() {
    // Read evaluation result from local storage
    let evaluationResult = wx.getStorageSync('evaluationResult');
    if (evaluationResult) {
      if (typeof evaluationResult === 'string') {
        evaluationResult = JSON.parse(evaluationResult);
      }
      this.setData({
        evaluationResult,
        itemName: evaluationResult.itemName || ''
      });
    }
  },

  /** Item name input */
  onItemNameChange(e) {
    this.setData({ itemName: e.detail.value });
  },

  /** Description input */
  onDescChange(e) {
    this.setData({ description: e.detail.value });
  },

  /** Anonymous toggle */
  onAnonymousChange(e) {
    this.setData({ isAnonymous: e.detail.value });
  },

  /** Choose and upload image */
  onChooseImage() {
    const that = this;
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success(res) {
        const tempFilePath = res.tempFilePaths[0];
        that.uploadImage(tempFilePath);
      },
      fail(err) {
        console.error('选择图片失败:', err);
      }
    });
  },

  /** Upload image to cloud storage */
  uploadImage(filePath) {
    this.setData({ uploading: true });

    const cloudPath = 'post-images/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.png';

    wx.cloud.uploadFile({
      cloudPath,
      filePath,
      success: (res) => {
        this.setData({
          imageUrl: res.fileID,
          uploading: false
        });
      },
      fail: (err) => {
        console.error('上传图片失败:', err);
        this.setData({ uploading: false });
        wx.showToast({ title: '图片上传失败', icon: 'none' });
      }
    });
  },

  /** Remove uploaded image */
  onRemoveImage() {
    this.setData({ imageUrl: '' });
  },

  /** Preview image */
  onPreviewImage() {
    wx.previewImage({
      urls: [this.data.imageUrl],
      current: this.data.imageUrl
    });
  },

  /** Submit to posts collection */
  async onSubmit() {
    const { itemName, description, imageUrl, isAnonymous, evaluationResult } = this.data;

    // Validate item name
    if (!itemName || !itemName.trim()) {
      wx.showToast({ title: '请输入物品名称', icon: 'none' });
      return;
    }

    if (!evaluationResult) {
      wx.showToast({ title: '没有评测结果，请先评测', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    wx.showLoading({ title: '发布中...' });

    try {
      // Get openid
      const openid = await app.getOpenid();

      // Get user info from globalData or storage
      const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo') || {};
      const avatarUrl = userInfo.avatarUrl || '../../images/default-avatar.png';
      const nickName = userInfo.nickName || '微信用户';

      // Build post data
      const postData = {
        itemName: itemName.trim(),
        description: description.trim(),
        imageUrl: imageUrl || '',
        score: evaluationResult.totalScore,
        conclusion: evaluationResult.conclusion,
        dimensionScores: evaluationResult.dimensionScores,
        isAnonymous: !!isAnonymous,
        valueCount: 0,
        notValueCount: 0,
        hasFeedback: false,
        didBuy: false,
        authorId: openid,
        avatarUrl: isAnonymous ? '' : avatarUrl,
        nickName: isAnonymous ? '' : nickName,
        createdAt: new Date()
      };

      // Save to posts collection
      const res = await db.collection('posts').add({ data: postData });

      wx.hideLoading();
      this.setData({ submitting: false });

      wx.showToast({
        title: '发布成功',
        icon: 'success',
        duration: 1500
      });

      // Reset evaluate page for next time, then go to community tab
      app.globalData.evaluateMode = 'reset';
      setTimeout(() => {
        wx.switchTab({ url: '../index/index' });
      }, 1500);

    } catch (err) {
      console.error('发布失败:', err);
      wx.hideLoading();
      this.setData({ submitting: false });
      wx.showToast({ title: '发布失败，请重试', icon: 'none' });
    }
  }
});
