const { getPresetList } = require('../../utils/weights');
const { calculateBaseScore, calculateScore } = require('../../utils/score');
const app = getApp();

// ---- 核心题 ----
const BASE_QUESTIONS = [
  {
    id: 'price',
    label: '这个东西多少钱？',
    type: 'number',
    placeholder: '请输入价格（元）'
  },
  {
    id: 'savings',
    label: '你目前的存款大概是多少？',
    type: 'radio',
    options: ['没有存款', '1万以下', '1-5万', '5-20万', '20万以上']
  },
  {
    id: 'monthlyDisposable',
    label: '你每月可自由支配的钱是多少？（扣除房租/房贷/生活费后）',
    type: 'number',
    placeholder: '请输入月可支配金额（元）'
  },
  {
    id: 'desire',
    label: '你有多想要这个东西？',
    type: 'slider',
    sliderMin: 1,
    sliderMax: 10
  },
  {
    id: 'practicality',
    label: '你预计多久会用一次？',
    type: 'radio',
    options: ['每天', '每周', '每月', '偶尔', '几乎不用']
  },
  {
    id: 'valueForMoney',
    label: '同类产品里，你觉得它值这个价吗？',
    type: 'stars',
    starMax: 5
  },
  {
    id: 'urgency',
    label: '你现在就必须买，还是可以再等等？',
    type: 'radio',
    options: ['立刻要', '可以等一个月', '可买可不买', '纯种草']
  }
];

// ---- 扩展题 ----
const EXTENDED_QUESTIONS = [
  {
    id: 'valueRetention',
    label: '你觉得半年后还值原价多少？',
    type: 'radio',
    options: ['80%+', '50-80%', '20-50%', '几乎归零']
  },
  {
    id: 'burden',
    label: '买了之后会影响其他必要开销吗？',
    type: 'radio',
    options: ['完全不', '稍微紧张', '明显吃紧', '要吃土']
  },
  {
    id: 'alternatives',
    label: '有更便宜的替代品吗？',
    type: 'radio',
    options: ['没有，就它', '有但差很多', '有差不多的', '有更好的还便宜']
  },
  {
    id: 'emotionalValue',
    label: '这个东西带来的快乐能持续多久？',
    type: 'radio',
    options: ['长期', '几个月', '几周', '到手就腻']
  },
  {
    id: 'herdMentality',
    label: '你是因为别人都在买才想买的吗？',
    type: 'slider',
    sliderMin: 1,
    sliderMax: 5
  },
  {
    id: 'pastExperience',
    label: '之前买过类似的东西吗？后悔了吗？',
    type: 'radio',
    options: ['没买过', '买过，很满意', '买过，后悔了']
  },
  {
    id: 'lifespan',
    label: '预计能用多久？',
    type: 'radio',
    options: ['几年', '一年多', '几个月', '一次性']
  },
  {
    id: 'hiddenCosts',
    label: '买了之后有没有额外花销？（配件/维护/订阅等）',
    type: 'radio',
    options: ['没有', '少量', '不少', '是个无底洞']
  },
  {
    id: 'opportunityCost',
    label: '不买的话这笔钱最可能用在哪？',
    type: 'radio',
    options: ['存起来', '投资', '买别的', '旅行', '吃吃喝喝']
  }
];

function initInputState(q) {
  return {
    currentInputType: q.type,
    numberValue: '',
    sliderValue: q.sliderMin || 5,
    sliderMin: q.sliderMin || 1,
    sliderMax: q.sliderMax || 10,
    starValue: 0,
    radioValue: -1,
    radioOptions: q.options || []
  };
}

Page({
  data: {
    step: 0,
    mode: 'base',
    itemName: '',
    presets: [],
    selectedPreset: '',
    questionIndex: 0,
    questions: [],
    totalQuestions: 0,
    answers: {},
    currentQuestion: null,
    currentInputType: '',
    numberValue: '',
    sliderValue: 5,
    sliderMin: 1,
    sliderMax: 10,
    starValue: 0,
    radioValue: -1,
    radioOptions: []
  },

  onLoad(options) {
    const presets = getPresetList();

    if (options.mode === 'extended') {
      try {
        const raw = wx.getStorageSync('evaluationState');
        if (raw) {
          const state = typeof raw === 'string' ? JSON.parse(raw) : raw;
          const firstQ = EXTENDED_QUESTIONS[0];
          this.setData({
            mode: 'extended',
            step: 2,
            itemName: state.itemName || '',
            selectedPreset: state.selectedPreset || '',
            answers: state.answers || {},
            questions: EXTENDED_QUESTIONS,
            totalQuestions: EXTENDED_QUESTIONS.length,
            questionIndex: 0,
            presets: presets,
            currentQuestion: firstQ,
            ...initInputState(firstQ)
          });
          return;
        }
      } catch (e) {
        console.warn('读取 evaluationState 失败，回退到全新流程', e);
      }
    }

    this.setData({ mode: 'base', step: 0, presets: presets });
  },

  onShow() {
    const mode = app.globalData.evaluateMode;
    if (!mode) return;
    app.globalData.evaluateMode = '';

    if (mode === 'reset') {
      this.setData({
        step: 0,
        mode: 'base',
        itemName: '',
        selectedPreset: '',
        questionIndex: 0,
        questions: [],
        answers: {},
        currentQuestion: null
      });
      return;
    }

    if (mode === 'extended') {
      try {
        const raw = wx.getStorageSync('evaluationState');
        if (raw) {
          const state = typeof raw === 'string' ? JSON.parse(raw) : raw;
          const firstQ = EXTENDED_QUESTIONS[0];
          this.setData({
            mode: 'extended',
            step: 2,
            itemName: state.itemName || '',
            selectedPreset: state.selectedPreset || '',
            answers: state.answers || {},
            questions: EXTENDED_QUESTIONS,
            totalQuestions: EXTENDED_QUESTIONS.length,
            questionIndex: 0,
            currentQuestion: firstQ,
            ...initInputState(firstQ)
          });
        }
      } catch (e) {
        console.warn('读取 evaluationState 失败', e);
        this.setData({ step: 0, mode: 'base' });
      }
    }
  },

  // ------- Step 0: 名称 -------
  onNameInput(e) {
    this.setData({ itemName: e.detail.value.trim() });
  },

  onNextFromName() {
    if (!this.data.itemName) {
      wx.showToast({ title: '请输入物品名称', icon: 'none' });
      return;
    }
    this.setData({ step: 1 });
  },

  // ------- Step 1: 预设 -------
  onSelectPreset(e) {
    this.setData({ selectedPreset: e.currentTarget.dataset.key });
  },

  onNextFromPreset() {
    if (!this.data.selectedPreset) {
      wx.showToast({ title: '请先选择一个消费风格', icon: 'none' });
      return;
    }
    const firstQ = BASE_QUESTIONS[0];
    this.setData({
      step: 2,
      questions: BASE_QUESTIONS,
      totalQuestions: BASE_QUESTIONS.length,
      questionIndex: 0,
      currentQuestion: firstQ,
      ...initInputState(firstQ)
    });
  },

  // ------- Step 2: 答题 -------

  onNumberInput(e) {
    this.setData({ numberValue: e.detail.value });
  },

  onSliderChange(e) {
    this.setData({ sliderValue: e.detail.value });
  },

  onStarTap(e) {
    const val = Number(e.currentTarget.dataset.value);
    const newVal = this.data.starValue === val ? 0 : val;
    this.setData({ starValue: newVal });
  },

  // 选择题（radio）
  onRadioTap(e) {
    this.setData({ radioValue: Number(e.currentTarget.dataset.index) });
  },

  getCurrentAnswer() {
    const { currentInputType, numberValue, sliderValue, starValue, radioValue, radioOptions } = this.data;
    switch (currentInputType) {
      case 'number':
        return Number(numberValue);
      case 'slider':
        return sliderValue;
      case 'stars':
        return starValue;
      case 'radio':
        return radioValue >= 0 ? radioOptions[radioValue] : '';
      default:
        return '';
    }
  },

  validateCurrentAnswer() {
    const { currentInputType, starValue, radioValue } = this.data;
    const value = this.getCurrentAnswer();
    if (currentInputType === 'number' && (!value || value <= 0)) {
      wx.showToast({ title: '请输入有效数值', icon: 'none' });
      return false;
    }
    if (currentInputType === 'stars' && starValue === 0) {
      wx.showToast({ title: '请点击星星评分', icon: 'none' });
      return false;
    }
    if (currentInputType === 'radio' && radioValue < 0) {
      wx.showToast({ title: '请选择一个选项', icon: 'none' });
      return false;
    }
    return true;
  },

  saveCurrentAnswer() {
    const value = this.getCurrentAnswer();
    const answers = { ...this.data.answers, [this.data.currentQuestion.id]: value };
    this.setData({ answers });
  },

  onNextQuestion() {
    if (!this.validateCurrentAnswer()) return;
    this.saveCurrentAnswer();

    const { questionIndex, totalQuestions, questions, mode, answers, itemName, selectedPreset } = this.data;
    const isLast = questionIndex === totalQuestions - 1;

    if (isLast) {
      if (mode === 'base') {
        const state = { itemName, selectedPreset, answers };
        wx.setStorageSync('evaluationState', JSON.stringify(state));

        const result = calculateBaseScore(answers, selectedPreset, app.globalData.customWeights);
        result.itemName = itemName;
        result.date = new Date().toISOString();
        result.presetKey = selectedPreset;
        wx.setStorageSync('evaluationResult', JSON.stringify(result));

        const history = wx.getStorageSync('evaluationHistory') || [];
        history.unshift({
          itemName,
          score: result.totalScore,
          conclusion: result.conclusion,
          presetKey: selectedPreset,
          date: result.date
        });
        wx.setStorageSync('evaluationHistory', history);

        wx.navigateTo({ url: '../result/result?mode=base' });
      } else {
        const result = calculateScore(answers, selectedPreset, app.globalData.customWeights);
        result.itemName = itemName;
        result.date = new Date().toISOString();
        result.presetKey = selectedPreset;
        wx.setStorageSync('evaluationResult', JSON.stringify(result));

        const history = wx.getStorageSync('evaluationHistory') || [];
        if (history.length > 0 && history[0].itemName === itemName) {
          history[0].score = result.totalScore;
          history[0].conclusion = result.conclusion;
          history[0].date = result.date;
          wx.setStorageSync('evaluationHistory', history);
        }

        wx.navigateTo({ url: '../result/result?mode=full' });
      }
      return;
    }

    const nextIndex = questionIndex + 1;
    const nextQ = questions[nextIndex];
    this.setData({
      questionIndex: nextIndex,
      currentQuestion: nextQ,
      ...initInputState(nextQ)
    });
  },

  onPrevQuestion() {
    const { questionIndex, questions, answers } = this.data;
    if (questionIndex <= 0) return;

    this.saveCurrentAnswer();

    const prevIndex = questionIndex - 1;
    const prevQ = questions[prevIndex];
    const prevAnswer = answers[prevQ.id];
    const inputState = initInputState(prevQ);

    if (prevAnswer !== undefined) {
      switch (prevQ.type) {
        case 'number':
          inputState.numberValue = String(prevAnswer);
          break;
        case 'slider':
          inputState.sliderValue = prevAnswer;
          break;
        case 'stars':
          inputState.starValue = prevAnswer;
          break;
        case 'radio':
          inputState.radioValue = prevQ.options.indexOf(prevAnswer);
          break;
      }
    }

    this.setData({
      questionIndex: prevIndex,
      currentQuestion: prevQ,
      ...inputState
    });
  }
});
