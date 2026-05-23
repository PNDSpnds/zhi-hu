// profile.js
const app = getApp();
const db = wx.cloud.database();

const { getPresetList, getPresetWeights, dimensionLabels, mergeWeights } = require('../../utils/weights');

Page({
  data: {
    // ---- User ----
    userInfo: null,
    isNewUser: false,

    // ---- Setup ----
    tempAvatar: '',
    tempNickname: '',

    // ---- Avatar system ----
    avatarList: [],
    avatarBgColors: [],
    avatarBgColor: '#4A90D9',
    showAvatarPicker: false,

    // ---- Nickname ----
    showNicknameEdit: false,
    nicknameInput: '',

    // ---- Stats ----
    evalCount: 0,
    postCount: 0,

    // ---- Weight preset ----
    presetList: [],
    currentPresetKey: 'pragmatic',
    currentPreset: {},
    showPresetPicker: false,

    // ---- Custom weights ----
    showWeightSliders: false,
    customWeightSliders: [],

    // ---- Lists ----
    evaluations: [],
    posts: [],

    // ---- About ----
    showAbout: false
  },

  onLoad() {
    // Avatar emoji options
    const avatarList = [
      '🐱', '🐶', '🐼', '🐨', '🦊', '🐰', '🐸', '🦁',
      '🐯', '🐮', '🐷', '🐭', '🐹', '🐻', '🐔', '🐧',
      '🦄', '🐙', '🦀', '🐳', '🦋', '🌸', '🍕', '🎮',
      '🎸', '🎨', '⚽', '🚀', '🌈', '💎', '🎭', '🎪'
    ];

    const avatarBgColors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
      '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
      '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA',
      '#F1948A', '#85929E', '#AED6F1', '#FAD7A0',
      '#FF9FF3', '#54A0FF', '#5F27CD', '#01A3A4',
      '#F368E0', '#FF6348', '#7BED9F', '#70A1FF',
      '#FFA502', '#2ED573', '#FF6B81', '#1E90FF',
      '#A29BFE', '#FD79A8', '#00CEC9', '#E17055'
    ];

    // Preset list from weights utility
    const presetList = getPresetList();

    this.setData({
      avatarList,
      avatarBgColors,
      presetList
    });

    // Load user profile
    this.loadUserProfile();
  },

  onShow() {
    // Refresh evaluations and posts on each show
    if (!this.data.isNewUser) {
      this.loadEvaluations();
      this.loadPosts();
    }
  },

  // ==================== Load User Profile ====================
  async loadUserProfile() {
    let userInfo = app.globalData.userInfo;

    // 如果 globalData 没有，尝试从本地存储恢复
    if (!userInfo || !userInfo.nickName) {
      userInfo = wx.getStorageSync('userInfo');
      if (userInfo) {
        app.globalData.userInfo = userInfo;
      }
    }

    // 本地也没有，尝试从云端加载
    if (!userInfo || !userInfo.nickName) {
      try {
        const openid = await app.getOpenid();
        if (openid) {
          const res = await db.collection('users').where({ _openid: openid }).get();
          if (res.data && res.data.length > 0) {
            userInfo = res.data[0];
            app.globalData.userInfo = userInfo;
            wx.setStorageSync('userInfo', userInfo);
          }
        }
      } catch (e) {
        console.warn('云端加载用户失败', e);
      }
    }

    if (userInfo && userInfo.nickName) {
      // 已有用户
      const presetKey = app.globalData.weightPreset || userInfo.weightPreset || 'pragmatic';
      const currentPreset = this.data.presetList.find(p => p.key === presetKey) || this.data.presetList[0];
      const avatarBgColor = this.getAvatarBgColor(userInfo.avatarUrl);

      const customWeightSliders = this.buildWeightSliders(presetKey, app.globalData.customWeights);

      this.setData({
        userInfo,
        isNewUser: false,
        avatarBgColor,
        currentPresetKey: presetKey,
        currentPreset,
        customWeightSliders
      });

      this.loadEvaluations();
      this.loadPosts();
    } else {
      // 新用户
      const tempAvatar = this.data.avatarList[Math.floor(Math.random() * this.data.avatarList.length)];
      const tempNickname = '值友' + String(Math.floor(Math.random() * 9000) + 1000);

      this.setData({
        isNewUser: true,
        tempAvatar,
        tempNickname,
        userInfo: { avatarUrl: tempAvatar, nickName: tempNickname }
      });
    }
  },

  // ==================== User Setup ====================
  onSetupPickAvatar(e) {
    this.setData({ tempAvatar: e.currentTarget.dataset.emoji });
  },

  onSetupNicknameInput(e) {
    this.setData({ tempNickname: e.detail.value });
  },

  async onSaveProfile() {
    const { tempAvatar, tempNickname } = this.data;

    if (!tempNickname || !tempNickname.trim()) {
      wx.showToast({ title: '请输入昵称', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '保存中...' });

    try {
      const openid = await app.getOpenid();
      const defaultPresetKey = 'pragmatic';
      const defaultPreset = this.data.presetList.find(p => p.key === defaultPresetKey) || this.data.presetList[0];
      const userInfo = {
        nickName: tempNickname.trim(),
        avatarUrl: tempAvatar,
        weightPreset: defaultPresetKey,
        customWeights: null,
        createdAt: new Date().toISOString()
      };

      // Save to globalData
      app.globalData.userInfo = userInfo;
      app.globalData.weightPreset = defaultPresetKey;
      app.globalData.customWeights = null;

      // Persist locally
      wx.setStorageSync('userInfo', userInfo);
      wx.setStorageSync('weightPreset', defaultPresetKey);

      // Persist to cloud
      try {
        const usersCollection = db.collection('users');
        const existRes = await usersCollection.where({ _openid: openid }).get();

        if (existRes.data && existRes.data.length > 0) {
          await usersCollection.doc(existRes.data[0]._id).update({
            data: {
              nickName: userInfo.nickName,
              avatarUrl: userInfo.avatarUrl,
              weightPreset: userInfo.weightPreset,
              customWeights: userInfo.customWeights,
              updatedAt: new Date()
            }
          });
        } else {
          await usersCollection.add({ data: userInfo });
        }
      } catch (cloudErr) {
        console.warn('Cloud save failed, using local only:', cloudErr);
      }

      wx.hideLoading();
      wx.showToast({ title: '设置完成', icon: 'success' });

      const avatarBgColor = this.getAvatarBgColor(tempAvatar);
      const customWeightSliders = this.buildWeightSliders(defaultPresetKey, null);

      this.setData({
        isNewUser: false,
        userInfo,
        avatarBgColor,
        currentPresetKey: defaultPresetKey,
        currentPreset: defaultPreset,
        customWeightSliders
      });

      this.loadEvaluations();
      this.loadPosts();
    } catch (err) {
      wx.hideLoading();
      console.error('Save profile failed:', err);
      wx.showToast({ title: '保存失败，请重试', icon: 'none' });
    }
  },

  // ==================== Avatar Handling ====================
  onTapAvatar() {
    if (this.data.isNewUser) return;
    this.setData({ showAvatarPicker: true });
  },

  onPickAvatar(e) {
    const emoji = e.currentTarget.dataset.emoji;
    this.setData({
      'userInfo.avatarUrl': emoji
    });
  },

  onConfirmAvatar() {
    if (!this.data.userInfo.avatarUrl) return;
    this.setData({
      showAvatarPicker: false,
      avatarBgColor: this.getAvatarBgColor(this.data.userInfo.avatarUrl)
    });
    this.saveUserInfoToCloud();
  },

  onCloseAvatarPicker() {
    // Revert to original avatar
    this.setData({
      showAvatarPicker: false,
      'userInfo.avatarUrl': app.globalData.userInfo ? app.globalData.userInfo.avatarUrl : this.data.userInfo.avatarUrl
    });
  },

  getAvatarBgColor(emoji) {
    if (!emoji) return '#4A90D9';
    const { avatarList, avatarBgColors } = this.data;
    const idx = avatarList.indexOf(emoji);
    return idx >= 0 ? avatarBgColors[idx % avatarBgColors.length] : '#4A90D9';
  },

  // ==================== Nickname Handling ====================
  onTapNickname() {
    if (this.data.isNewUser) return;
    this.setData({
      showNicknameEdit: true,
      nicknameInput: this.data.userInfo.nickName || ''
    });
  },

  onNicknameInput(e) {
    this.setData({ nicknameInput: e.detail.value });
  },

  onConfirmNickname() {
    const name = (this.data.nicknameInput || '').trim();
    if (!name) {
      wx.showToast({ title: '昵称不能为空', icon: 'none' });
      return;
    }
    this.setData({
      showNicknameEdit: false,
      'userInfo.nickName': name
    });
    this.saveUserInfoToCloud();
  },

  onCloseNicknameEdit() {
    this.setData({ showNicknameEdit: false });
  },

  // ==================== Weight Preset ====================
  onTapPreset() {
    this.setData({ showPresetPicker: true });
  },

  onSelectPreset(e) {
    const key = e.currentTarget.dataset.key;
    const currentPreset = this.data.presetList.find(p => p.key === key);
    if (!currentPreset) return;

    this.setData({
      currentPresetKey: key,
      currentPreset,
      showPresetPicker: false
    });

    app.globalData.weightPreset = key;
    wx.setStorageSync('weightPreset', key);

    // Reset custom weights when switching preset
    app.globalData.customWeights = null;
    wx.removeStorageSync('customWeights');

    // Rebuild sliders from new preset
    const customWeightSliders = this.buildWeightSliders(key, null);
    this.setData({ customWeightSliders });

    this.saveUserInfoToCloud();
    wx.showToast({ title: '已切换到「' + currentPreset.name + '」', icon: 'success' });
  },

  onClosePresetPicker() {
    this.setData({ showPresetPicker: false });
  },

  // ==================== Custom Weight Tuning ====================
  onToggleWeightSliders() {
    this.setData({ showWeightSliders: !this.data.showWeightSliders });
  },

  buildWeightSliders(presetKey, customOverrides) {
    const presetWeights = getPresetWeights(presetKey);
    const effectiveWeights = customOverrides
      ? mergeWeights(presetWeights, customOverrides)
      : presetWeights;

    return Object.keys(effectiveWeights).map(key => ({
      key,
      label: dimensionLabels[key] || key,
      value: Math.round(effectiveWeights[key] * 100)
    }));
  },

  onWeightSliderChange(e) {
    const key = e.currentTarget.dataset.key;
    const value = e.detail.value;
    const sliders = this.data.customWeightSliders.map(item => {
      if (item.key === key) {
        return { ...item, value };
      }
      return item;
    });
    this.setData({ customWeightSliders: sliders });
  },

  onResetWeights() {
    wx.showModal({
      title: '恢复默认',
      content: '确定要恢复为预设权重吗？自定义调整将被清除。',
      success: (res) => {
        if (res.confirm) {
          app.globalData.customWeights = null;
          wx.removeStorageSync('customWeights');
          const sliders = this.buildWeightSliders(this.data.currentPresetKey, null);
          this.setData({ customWeightSliders: sliders });
          wx.showToast({ title: '已恢复预设权重', icon: 'success' });
        }
      }
    });
  },

  onSaveCustomWeights() {
    const sliders = this.data.customWeightSliders;
    const rawWeights = {};
    sliders.forEach(item => {
      rawWeights[item.key] = item.value / 100;
    });

    // Normalize to sum to 1
    const total = Object.values(rawWeights).reduce((sum, v) => sum + v, 0);
    const customWeights = {};
    if (total > 0) {
      Object.keys(rawWeights).forEach(key => {
        customWeights[key] = parseFloat((rawWeights[key] / total).toFixed(3));
      });
    }

    app.globalData.customWeights = customWeights;
    wx.setStorageSync('customWeights', customWeights);
    this.saveUserInfoToCloud();

    wx.showToast({ title: '自定义权重已保存', icon: 'success' });
  },

  // ==================== My Evaluations ====================
  loadEvaluations() {
    try {
      const history = wx.getStorageSync('evaluationHistory') || [];
      // Sort by date descending
      history.sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0));
      this.setData({
        evaluations: history.slice(0, 20), // show latest 20
        evalCount: history.length
      });
    } catch (err) {
      console.warn('Failed to load evaluation history:', err);
      this.setData({ evaluations: [], evalCount: 0 });
    }
  },

  onTapEvaluation(e) {
    const index = e.currentTarget.dataset.index;
    const evaluation = this.data.evaluations[index];
    if (!evaluation) return;

    // Store evaluation data for the result page
    wx.setStorageSync('currentEvaluation', evaluation);
    wx.navigateTo({ url: '/pages/result/result?from=history' });
  },

  // ==================== My Posts ====================
  async loadPosts() {
    try {
      const openid = await app.getOpenid();
      const postsCollection = db.collection('posts');

      const res = await postsCollection
        .where({ _openid: openid })
        .orderBy('createdAt', 'desc')
        .limit(20)
        .get();

      if (res.data && res.data.length > 0) {
        const posts = res.data.map(post => ({
          id: post._id,
          itemName: post.itemName || '未命名',
          valueCount: post.valueCount || post.value || 0,
          notValueCount: post.notValueCount || post.notValue || 0,
          date: this.formatDate(post.createdAt || post.createTime)
        }));
        this.setData({ posts, postCount: posts.length });
      } else {
        // Also check local storage for offline posts
        const localPosts = wx.getStorageSync('myPosts') || [];
        this.setData({
          posts: localPosts.slice(0, 20),
          postCount: localPosts.length
        });
      }
    } catch (err) {
      console.warn('Failed to load posts from cloud, trying local:', err);
      const localPosts = wx.getStorageSync('myPosts') || [];
      this.setData({
        posts: localPosts.slice(0, 20),
        postCount: localPosts.length
      });
    }
  },

  onTapPost(e) {
    const index = e.currentTarget.dataset.index;
    const post = this.data.posts[index];
    if (!post || !post.id) return;
    wx.navigateTo({ url: '/pages/detail/detail?id=' + post.id });
  },

  // ==================== About ====================
  onTapAbout() {
    this.setData({ showAbout: true });
  },

  onCloseAbout() {
    this.setData({ showAbout: false });
  },

  // ==================== Helpers ====================
  async saveUserInfoToCloud() {
    // Update globalData
    const userInfo = this.data.userInfo;
    app.globalData.userInfo = userInfo;
    wx.setStorageSync('userInfo', userInfo);

    // Persist to cloud
    try {
      const openid = await app.getOpenid();
      const usersCollection = db.collection('users');
      const existRes = await usersCollection.where({ _openid: openid }).get();

      const data = {
        nickName: userInfo.nickName,
        avatarUrl: userInfo.avatarUrl,
        weightPreset: app.globalData.weightPreset || this.data.currentPresetKey,
        customWeights: app.globalData.customWeights || null,
        updatedAt: new Date()
      };

      if (existRes.data && existRes.data.length > 0) {
        await usersCollection.doc(existRes.data[0]._id).update({ data });
      } else {
        data.createdAt = new Date();
        await usersCollection.add({ data });
      }
    } catch (err) {
      console.warn('Cloud save failed, saved locally:', err);
    }
  },

  formatDate(dateVal) {
    if (!dateVal) return '';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }
});
