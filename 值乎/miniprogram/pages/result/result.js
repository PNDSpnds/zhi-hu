const { getDimensionAdvice } = require('../../utils/score');
const app = getApp();

Page({
  data: {
    score: 0,
    conclusion: '',
    dimensionScores: null,
    itemName: '',
    mode: 'base',   // 'base' | 'full'
    advices: []
  },

  onLoad(options) {
    const queryMode = options.mode || 'base';
    try {
      const raw = wx.getStorageSync('evaluationResult');
      if (!raw) {
        this.showEmpty();
        return;
      }
      const result = JSON.parse(raw);
      const advices = result.isExtended
        ? getDimensionAdvice(result.dimensionScores)
        : [];
      this.setData({
        score: result.totalScore || 0,
        conclusion: result.conclusion || '',
        dimensionScores: result.dimensionScores || null,
        itemName: result.itemName || '',
        mode: queryMode === 'full' ? 'full' : 'base',
        advices: advices
      });
    } catch (e) {
      console.error('读取评测结果失败', e);
      this.showEmpty();
    }
  },

  // 无数据时的缺省处理
  showEmpty() {
    wx.showToast({ title: '暂无评测数据', icon: 'none' });
    setTimeout(() => {
      wx.switchTab({ url: '../evaluate/evaluate' });
    }, 1500);
  },

  // 深入评测 → 回到评测页进入扩展模式
  onExtendedEvaluate() {
    app.globalData.evaluateMode = 'extended';
    wx.switchTab({ url: '../evaluate/evaluate' });
  },

  // 发到社区
  onGoToPost() {
    wx.navigateTo({ url: '../post/post' });
  },

  // 再测一次 → 回到评测 tab 并重置
  onRetry() {
    app.globalData.evaluateMode = 'reset';
    wx.navigateBack({
      fail() {
        wx.switchTab({ url: '../evaluate/evaluate' });
      }
    });
  },

  // 分享
  onShareAppMessage() {
    const { score, conclusion, itemName } = this.data;
    return {
      title: itemName
        ? `「${itemName}」值得指数 ${score} 分 —— ${conclusion}`
        : `我在值乎测了「${itemName || '一件东西'}」，得了 ${score} 分，你觉得呢？`,
      path: '/pages/evaluate/evaluate'
    };
  }
});
