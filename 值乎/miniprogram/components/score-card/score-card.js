const { dimensionLabels } = require('../../utils/weights');

Component({
  properties: {
    // 总分数 0-100
    score: {
      type: Number,
      value: 50
    },
    // 结论文案
    conclusion: {
      type: String,
      value: ''
    },
    // 维度得分 { dim: { score, weight } }
    dimensionScores: {
      type: Object,
      value: null
    },
    // 物品名称
    itemName: {
      type: String,
      value: ''
    },
    // 是否紧凑模式（feed 卡片用）
    compact: {
      type: Boolean,
      value: false
    }
  },

  data: {
    dimensionList: []
  },

  observers: {
    'dimensionScores': function (val) {
      if (!val) return;
      const list = Object.keys(val).map(dim => ({
        dim,
        label: dimensionLabels[dim] || dim,
        info: val[dim]
      }));
      // 按权重降序排列
      list.sort((a, b) => b.info.weight - a.info.weight);
      this.setData({ dimensionList: list });
    }
  }
});
