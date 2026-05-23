App({
  onLaunch: function () {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: 'cloud1-d8gqnvzfp74ca6142',
        traceUser: true
      });
    }

    this.globalData = {
      userInfo: null,
      openid: '',
      weightPreset: 'pragmatic',
      customWeights: null
    };

    // 启动时从本地恢复用户数据，避免每次都重新设置
    try {
      const userInfo = wx.getStorageSync('userInfo');
      if (userInfo) {
        this.globalData.userInfo = userInfo;
      }
      const weightPreset = wx.getStorageSync('weightPreset');
      if (weightPreset) {
        this.globalData.weightPreset = weightPreset;
      }
      const customWeights = wx.getStorageSync('customWeights');
      if (customWeights) {
        this.globalData.customWeights = customWeights;
      }
    } catch (e) {
      // ignore storage errors
    }
  },

  // 获取用户 openid
  getOpenid: function () {
    return new Promise((resolve, reject) => {
      if (this.globalData.openid) {
        resolve(this.globalData.openid);
        return;
      }
      wx.cloud.callFunction({
        name: 'login',
        success: res => {
          this.globalData.openid = res.result.openid;
          resolve(res.result.openid);
        },
        fail: reject
      });
    });
  }
});
