Component({
  properties: {
    // 投"值"的人数
    valueCount: {
      type: Number,
      value: 0
    },
    // 投"不值"的人数
    notValueCount: {
      type: Number,
      value: 0
    }
  },

  computed: {},

  data: {
    totalVotes: 0,
    valuePercent: 0,
    notValuePercent: 0
  },

  observers: {
    'valueCount, notValueCount': function (v, nv) {
      const total = v + nv;
      if (total === 0) {
        this.setData({
          totalVotes: 0,
          valuePercent: 0,
          notValuePercent: 0
        });
      } else {
        const vp = Math.round((v / total) * 100);
        const np = 100 - vp;
        this.setData({
          totalVotes: total,
          valuePercent: vp,
          notValuePercent: np
        });
      }
    }
  }
});
