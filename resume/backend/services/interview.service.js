/**
 * 面试模拟服务
 * - startInterview: 根据简历+JD生成初始面试题
 * - chatInterview: 多轮对话追问
 * - evaluateInterview: 最终评估
 */

const { safeJsonParse, arkExtractMessageContent } = require('./analysis.service');

async function startInterview({ resumeText, jobDescription }, { arkPostJson, textModel }) {
  const prompt = [
    '你是一位资深面试官。根据以下简历和岗位JD，生成面试问题。',
    '要求：',
    '1. 分析岗位核心要求，针对简历中的薄弱点设计问题',
    '2. 生成4类问题：技术问题(technical)、项目问题(project)、行为问题(behavioral)、HR问题(hr)',
    '3. 每类2-3个问题，按难度递增排列',
    '4. 第一个问题作为开场，其余问题后续逐一提出',
    '',
    '必须只输出JSON，格式如下：',
    '{',
    '  "greeting": "面试开场白，简短友好",',
    '  "firstQuestion": "第一个面试问题（从技术或项目类中选最有针对性的）",',
    '  "category": "technical|project|behavioral|hr",',
    '  "questionPool": {',
    '    "technical": ["问题1", "问题2", "问题3"],',
    '    "project": ["问题1", "问题2"],',
    '    "behavioral": ["问题1", "问题2"],',
    '    "hr": ["问题1", "问题2"]',
    '  },',
    '  "focusAreas": ["简历中需要深入追问的领域1", "领域2"]',
    '}',
    '',
    '岗位JD：',
    jobDescription || '(空)',
    '',
    '简历文本：',
    resumeText || '(空)',
  ].join('\n');

  const url = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
  const respJson = await arkPostJson(url, {
    model: textModel,
    messages: [
      { role: 'system', content: '你只输出合法JSON，不要Markdown，不要多余文字。' },
      { role: 'user', content: prompt },
    ],
  });

  const raw = arkExtractMessageContent(respJson);
  const parsed = safeJsonParse(raw);

  if (parsed && parsed.greeting && parsed.firstQuestion) {
    return parsed;
  }

  return {
    greeting: '你好，欢迎参加面试。我们今天会围绕你的简历和目标岗位进行交流，请放松作答。',
    firstQuestion: '请先简单介绍一下你自己和你的技术背景？',
    category: 'technical',
    questionPool: {
      technical: ['请介绍你最熟悉的技术栈及实际应用场景', '你如何解决技术方案选型的分歧？'],
      project: ['请讲一个最能体现你能力的项目', '项目中遇到最大的技术挑战是什么？'],
      behavioral: ['遇到需求变更时你如何处理？', '你和团队成员意见不一致时怎么办？'],
      hr: ['你为什么想加入我们公司？', '你的职业规划是什么？'],
    },
    focusAreas: ['项目经验深度', '技术能力验证'],
  };
}

async function chatInterview({ messages, questionPool, focusAreas }, { arkPostJson, textModel }) {
  const systemPrompt = [
    '你是一位资深面试官，正在进行模拟面试。',
    '规则：',
    '1. 根据候选人的回答进行追问，深入挖掘细节',
    '2. 追问方向：具体数据、决策原因、遇到的困难、最终结果',
    '3. 如果候选人回答过于笼统，要求其给出具体例子或数据',
    '4. 每次只问一个问题',
    '5. 当一个问题追问2-3轮后，切换到下一个问题',
    '6. 保持专业但友好的语气',
    '',
    '面试重点关注领域：' + (focusAreas || []).join('、'),
    '',
    '剩余题库（可从中选取下一个问题）：',
    JSON.stringify(questionPool || {}),
    '',
    '必须只输出JSON：',
    '{',
    '  "reply": "你的追问或下一个问题",',
    '  "category": "technical|project|behavioral|hr",',
    '  "isFollowUp": true或false（是否是追问）,',
    '  "isComplete": true或false（面试是否可以结束了）',
    '}',
  ].join('\n');

  const apiMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  ];

  const url = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
  const respJson = await arkPostJson(url, {
    model: textModel,
    messages: apiMessages,
  });

  const raw = arkExtractMessageContent(respJson);
  const parsed = safeJsonParse(raw);

  if (parsed && parsed.reply) {
    return parsed;
  }

  return {
    reply: '能否再详细说说？请给出一个具体的例子。',
    category: 'technical',
    isFollowUp: true,
    isComplete: false,
  };
}

async function evaluateInterview({ messages }, { arkPostJson, textModel }) {
  const transcript = messages
    .filter((m) => m.role !== 'system')
    .map((m) => `${m.role === 'assistant' ? '面试官' : '候选人'}：${m.content}`)
    .join('\n');

  const prompt = [
    '你是一位资深面试官和评估专家。请根据以下面试记录，给出综合评估。',
    '',
    '面试记录：',
    transcript,
    '',
    '必须只输出JSON：',
    '{',
    '  "technicalScore": 0-100,',
    '  "communicationScore": 0-100,',
    '  "starScore": 0-100,',
    '  "riskAnalysis": ["风险点1", "风险点2"],',
    '  "strengths": ["亮点1", "亮点2"],',
    '  "suggestions": ["建议1", "建议2", "建议3"],',
    '  "overallComment": "综合评价（2-3句话）",',
    '  "categoryScores": {',
    '    "technical": { "score": 0-100, "comment": "评价" },',
    '    "project": { "score": 0-100, "comment": "评价" },',
    '    "behavioral": { "score": 0-100, "comment": "评价" },',
    '    "hr": { "score": 0-100, "comment": "评价" }',
    '  }',
    '}',
  ].join('\n');

  const url = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
  const respJson = await arkPostJson(url, {
    model: textModel,
    messages: [
      { role: 'system', content: '你只输出合法JSON，不要Markdown，不要多余文字。' },
      { role: 'user', content: prompt },
    ],
  });

  const raw = arkExtractMessageContent(respJson);
  const parsed = safeJsonParse(raw);

  if (parsed && parsed.technicalScore !== undefined) {
    return parsed;
  }

  return {
    technicalScore: 60,
    communicationScore: 60,
    starScore: 55,
    riskAnalysis: ['回答缺乏具体数据支撑', '项目经验描述不够深入'],
    strengths: ['能基本表达自己的经验', '态度积极'],
    suggestions: ['使用STAR法则结构化回答', '补充具体数据和成果', '提前准备项目细节'],
    overallComment: '候选人基本能表达自己的经验，但回答深度不足，建议加强具体案例和数据支撑。',
    categoryScores: {
      technical: { score: 60, comment: '技术理解基本到位，但缺乏深度' },
      project: { score: 55, comment: '项目经验描述笼统，缺少细节' },
      behavioral: { score: 65, comment: '行为问题回答尚可，但缺少结构化' },
      hr: { score: 70, comment: 'HR问题回答较为自然' },
    },
  };
}

module.exports = { startInterview, chatInterview, evaluateInterview };
