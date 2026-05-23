/**
 * 评分算法
 * 每个维度 0-10 分，加权平均后 ×10 得到 0-100 的"值得指数"
 */

const { mergeWeights, getPresetWeights } = require('./weights');

// ---- 单维度打分函数 ----

// 经济适配：价格 / 月可支配收入
function scoreEconomicFit(price, monthlyDisposable) {
  if (!monthlyDisposable || monthlyDisposable <= 0) return 5;
  const ratio = price / monthlyDisposable;
  if (ratio <= 0.05) return 10;
  if (ratio <= 0.1) return 9;
  if (ratio <= 0.2) return 7;
  if (ratio <= 0.3) return 5;
  if (ratio <= 0.5) return 3;
  if (ratio <= 1.0) return 1;
  return 0;
}

// 存款：越多越有底气消费
function scoreSavings(level) {
  const map = { '没有存款': 2, '1万以下': 4, '1-5万': 6, '5-20万': 8, '20万以上': 10 };
  return map[level] !== undefined ? map[level] : 5;
}

// 渴望度：1-10 直接映射
function scoreDesire(value) {
  return Math.max(0, Math.min(10, Number(value) || 5));
}

// 实用度：使用频率
function scorePracticality(frequency) {
  const map = { '每天': 10, '每周': 8, '每月': 5, '偶尔': 3, '几乎不用': 0 };
  return map[frequency] !== undefined ? map[frequency] : 5;
}

// 性价比：1-5 星
function scoreValueForMoney(stars) {
  const s = Math.max(1, Math.min(5, Number(stars) || 3));
  return (s - 1) * 2.5; // 1→0, 2→2.5, 3→5, 4→7.5, 5→10
}

// 紧急度
function scoreUrgency(level) {
  const map = { '立刻要': 10, '可以等一个月': 6, '可买可不买': 3, '纯种草': 1 };
  return map[level] !== undefined ? map[level] : 5;
}

// 保值率
function scoreValueRetention(level) {
  const map = { '80%+': 10, '50-80%': 7, '20-50%': 4, '几乎归零': 1 };
  return map[level] !== undefined ? map[level] : 5;
}

// 负担感
function scoreBurden(level) {
  const map = { '完全不': 10, '稍微紧张': 6, '明显吃紧': 3, '要吃土': 0 };
  return map[level] !== undefined ? map[level] : 5;
}

// 替代方案
function scoreAlternatives(level) {
  const map = { '没有，就它': 10, '有但差很多': 7, '有差不多的': 3, '有更好的还便宜': 0 };
  return map[level] !== undefined ? map[level] : 5;
}

// 情感价值
function scoreEmotionalValue(level) {
  const map = { '长期': 10, '几个月': 7, '几周': 4, '到手就腻': 1 };
  return map[level] !== undefined ? map[level] : 5;
}

// 从众程度：1-5，越高从众越强 → 得分越低
function scoreHerdMentality(value) {
  const v = Math.max(1, Math.min(5, Number(value) || 3));
  return (6 - v) * 2.0; // 1→10, 2→8, 3→6, 4→4, 5→2
}

// 历史教训
function scorePastExperience(level) {
  const map = { '没买过': 5, '买过，很满意': 10, '买过，后悔了': 0 };
  return map[level] !== undefined ? map[level] : 5;
}

// 使用年限
function scoreLifespan(level) {
  const map = { '几年': 10, '一年多': 7, '几个月': 4, '一次性': 1 };
  return map[level] !== undefined ? map[level] : 5;
}

// 隐性成本
function scoreHiddenCosts(level) {
  const map = { '没有': 10, '少量': 7, '不少': 3, '是个无底洞': 0 };
  return map[level] !== undefined ? map[level] : 5;
}

// 机会成本
function scoreOpportunityCost(level) {
  const map = { '投资': 1, '存起来': 2, '买别的': 3, '吃吃喝喝': 6, '旅行': 6 };
  return map[level] !== undefined ? map[level] : 5;
}

// ---- 核心计算 ----

/**
 * 计算值得指数
 * @param {Object} answers - 用户答案
 * @param {String} presetKey - 预设权重 key
 * @param {Object} customOverrides - 自定义权重覆盖
 * @returns {Object} { totalScore, dimensionScores, conclusion }
 */
function calculateScore(answers, presetKey, customOverrides) {
  // 计算各维度原始分
  const rawScores = {
    经济适配: scoreEconomicFit(answers.price, answers.monthlyDisposable),
    渴望度: scoreDesire(answers.desire)
  };

  // 核心题维度
  if (answers.savings) {
    rawScores['存款状况'] = scoreSavings(answers.savings);
  }
  if (answers.practicality) {
    rawScores['实用度'] = scorePracticality(answers.practicality);
  }
  if (answers.valueForMoney) {
    rawScores['性价比'] = scoreValueForMoney(answers.valueForMoney);
  }
  if (answers.urgency) {
    rawScores['紧急度'] = scoreUrgency(answers.urgency);
  }

  // 扩展题维度
  if (answers.valueRetention !== undefined && answers.valueRetention !== null) {
    rawScores['保值率'] = scoreValueRetention(answers.valueRetention);
  }
  if (answers.burden !== undefined && answers.burden !== null) {
    rawScores['负担感'] = scoreBurden(answers.burden);
  }
  if (answers.alternatives !== undefined && answers.alternatives !== null) {
    rawScores['替代方案'] = scoreAlternatives(answers.alternatives);
  }
  if (answers.emotionalValue !== undefined && answers.emotionalValue !== null) {
    rawScores['情感价值'] = scoreEmotionalValue(answers.emotionalValue);
  }
  if (answers.herdMentality !== undefined && answers.herdMentality !== null) {
    rawScores['从众程度'] = scoreHerdMentality(answers.herdMentality);
  }
  if (answers.pastExperience !== undefined && answers.pastExperience !== null) {
    rawScores['历史教训'] = scorePastExperience(answers.pastExperience);
  }
  if (answers.lifespan !== undefined && answers.lifespan !== null) {
    rawScores['使用年限'] = scoreLifespan(answers.lifespan);
  }
  if (answers.hiddenCosts !== undefined && answers.hiddenCosts !== null) {
    rawScores['隐性成本'] = scoreHiddenCosts(answers.hiddenCosts);
  }
  if (answers.opportunityCost !== undefined && answers.opportunityCost !== null) {
    rawScores['机会成本'] = scoreOpportunityCost(answers.opportunityCost);
  }

  // 获取权重
  const presetWeights = getPresetWeights(presetKey || 'pragmatic');
  const weights = customOverrides
    ? mergeWeights(presetWeights, customOverrides)
    : presetWeights;

  // 加权计算
  let totalScore = 0;
  let totalWeight = 0;
  const dimensionScores = {};

  Object.keys(rawScores).forEach(dim => {
    const w = weights[dim] !== undefined ? weights[dim] : 0;
    dimensionScores[dim] = {
      score: rawScores[dim],
      weight: w
    };
    totalScore += rawScores[dim] * w;
    totalWeight += w;
  });

  // 归一化到 0-100
  const normalizedScore = totalWeight > 0
    ? Math.round((totalScore / totalWeight) * 10)
    : 50;

  return {
    totalScore: normalizedScore,
    dimensionScores,
    conclusion: getConclusion(normalizedScore),
    isExtended: Object.keys(rawScores).length > 5
  };
}

// 仅用核心题计算基础分
function calculateBaseScore(answers, presetKey, customOverrides) {
  return calculateScore(answers, presetKey, customOverrides);
}

// 结论文案
function getConclusion(score) {
  if (score >= 85) return '非常值得，赶紧下手吧';
  if (score >= 70) return '值得入手，可以货比三家';
  if (score >= 55) return '可以买，但建议再冷静想一想';
  if (score >= 40) return '不太建议，再观望一下';
  if (score >= 25) return '建议放下，省下这笔钱';
  return '千万别买，你以后会感谢现在的自己';
}

// 获取各维度的评价（用于结果页展示）
function getDimensionAdvice(dimensionScores) {
  const advices = [];
  const entries = Object.entries(dimensionScores).sort((a, b) => b[1].score - a[1].score);

  const best = entries.slice(0, 2);
  const worst = entries.slice(-2);

  best.forEach(([dim, info]) => {
    if (info.score >= 8) {
      advices.push({ type: 'good', dim, text: `"${dim}"表现优秀，这是加分项` });
    }
  });

  worst.forEach(([dim, info]) => {
    if (info.score <= 3) {
      advices.push({ type: 'bad', dim, text: `"${dim}"拖了后腿，这是风险点` });
    }
  });

  return advices;
}

module.exports = {
  calculateScore,
  calculateBaseScore,
  getConclusion,
  getDimensionAdvice,
  scoreEconomicFit,
  scoreSavings,
  scoreDesire,
  scorePracticality,
  scoreValueForMoney,
  scoreUrgency,
  scoreValueRetention,
  scoreBurden,
  scoreAlternatives,
  scoreEmotionalValue,
  scoreHerdMentality,
  scorePastExperience,
  scoreLifespan,
  scoreHiddenCosts,
  scoreOpportunityCost
};
