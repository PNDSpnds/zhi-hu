/**
 * 权重配置 - 三套预设 + 自定义微调
 * 所有权重之和为 1
 */

// 预设权重方案
const presets = {
  pragmatic: {
    name: '实用主义',
    desc: '东西得有用才买',
    icon: '🛠',
    weights: {
      经济适配: 0.18,
      存款状况: 0.04,
      渴望度: 0.04,
      实用度: 0.24,
      性价比: 0.18,
      紧急度: 0.05,
      保值率: 0.05,
      负担感: 0.05,
      替代方案: 0.05,
      情感价值: 0.03,
      从众程度: 0.01,
      历史教训: 0.02,
      使用年限: 0.03,
      隐性成本: 0.02,
      机会成本: 0.01
    }
  },
  hedonistic: {
    name: '享乐主义',
    desc: '快乐最重要',
    icon: '🎉',
    weights: {
      经济适配: 0.08,
      存款状况: 0.03,
      渴望度: 0.28,
      实用度: 0.05,
      性价比: 0.05,
      紧急度: 0.10,
      保值率: 0.02,
      负担感: 0.05,
      替代方案: 0.03,
      情感价值: 0.20,
      从众程度: 0.06,
      历史教训: 0.02,
      使用年限: 0.02,
      隐性成本: 0.01,
      机会成本: 0.00
    }
  },
  prudent: {
    name: '理财谨慎',
    desc: '每一分钱都要花在刀刃上',
    icon: '💰',
    weights: {
      经济适配: 0.22,
      存款状况: 0.07,
      渴望度: 0.04,
      实用度: 0.10,
      性价比: 0.10,
      紧急度: 0.02,
      保值率: 0.13,
      负担感: 0.13,
      替代方案: 0.10,
      情感价值: 0.03,
      从众程度: 0.01,
      历史教训: 0.02,
      使用年限: 0.02,
      隐性成本: 0.01,
      机会成本: 0.00
    }
  }
};

// 维度显示名称映射
const dimensionLabels = {
  经济适配: '经济适配',
  存款状况: '存款状况',
  渴望度: '渴望程度',
  实用度: '使用频率',
  性价比: '性价比',
  紧急度: '紧急程度',
  保值率: '保值能力',
  负担感: '负担程度',
  替代方案: '替代选择',
  情感价值: '情感价值',
  从众程度: '从众影响',
  历史教训: '历史经验',
  使用年限: '使用年限',
  隐性成本: '隐性成本',
  机会成本: '机会成本'
};

// 预设列表（供选择页使用）
function getPresetList() {
  return Object.keys(presets).map(key => ({
    key,
    name: presets[key].name,
    desc: presets[key].desc,
    icon: presets[key].icon
  }));
}

// 获取预设权重
function getPresetWeights(presetKey) {
  const preset = presets[presetKey];
  return preset ? JSON.parse(JSON.stringify(preset.weights)) : null;
}

// 合并自定义权重到预设
function mergeWeights(presetWeights, customOverrides) {
  const merged = { ...presetWeights };
  if (customOverrides) {
    Object.keys(customOverrides).forEach(key => {
      if (merged[key] !== undefined) {
        merged[key] = customOverrides[key];
      }
    });
  }
  // 归一化，确保总和为 1
  const total = Object.values(merged).reduce((sum, v) => sum + v, 0);
  if (total !== 1 && total > 0) {
    Object.keys(merged).forEach(key => {
      merged[key] = merged[key] / total;
    });
  }
  return merged;
}

module.exports = {
  presets,
  dimensionLabels,
  getPresetList,
  getPresetWeights,
  mergeWeights
};
