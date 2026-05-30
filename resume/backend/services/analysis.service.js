const JSON_SCHEMA_HINT = `{
  "diagnosis": {
    "structureScore": 0,
    "expressionScore": 0,
    "quantScore": 0,
    "atsScore": 0,
    "completenessScore": 0,
    "missingSections": [],
    "riskWarnings": [],
    "recommendations": { "structure": [], "expression": [], "quant": [], "ats": [] }
  },
  "matching": {
    "matchScore": 0,
    "jdKeywords": { "required": [], "bonus": [], "responsibilities": [], "seniority": [] },
    "matchedKeywords": [],
    "partialKeywords": [],
    "missingKeywords": [],
    "targetedAdvice": []
  },
  "optimization": {
    "rewrittenHighlights": [],
    "beforeAfter": [{ "before": "", "after": "", "reason": "" }],
    "fullDraft": ""
  },
  "interview": {
    "technicalQuestions": [],
    "projectQuestions": [],
    "behaviorQuestions": [],
    "riskQuestions": []
  },
  "career": {
    "recommendedRoles": [],
    "levelAssessment": "",
    "skillGaps": []
  }
}`;

function safeJsonParse(text) {
  if (!text || typeof text !== 'string') return null;
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first >= 0 && last > first) {
    try {
      return JSON.parse(text.slice(first, last + 1));
    } catch {
      /* fall through */
    }
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function arkExtractMessageContent(json) {
  const content = json?.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content;
  return '';
}

function normalizeAnalysisResult(raw, parsed) {
  const summary =
    typeof parsed?.diagnosis === 'string'
      ? parsed.diagnosis
      : typeof raw === 'string'
        ? raw.slice(0, 500)
        : 'AI 返回格式异常，请重试或换用 DOCX 简历。';

  const fallback = {
    diagnosis: {
      structureScore: 72,
      expressionScore: 72,
      quantScore: 68,
      atsScore: 70,
      completenessScore: 65,
      missingSections: ['工作经历信息不够完整', '项目成果量化不足'],
      riskWarnings: ['建议补充可验证成果', '避免过于笼统的职责描述'],
      recommendations: {
        structure: ['补充“教育经历-工作经历-项目经历-技能”完整链路'],
        expression: ['使用“动词 + 对象 + 结果”句式，减少空泛表述'],
        quant: ['尽量补充百分比、金额、人数、性能提升等量化指标'],
        ats: ['使用标准章节标题，减少图片/表格/双栏导致的解析问题'],
      },
    },
    matching: {
      matchScore: 70,
      jdKeywords: { required: [], bonus: [], responsibilities: [], seniority: [] },
      matchedKeywords: ['通用技能', '项目经验'],
      partialKeywords: ['部分技术栈匹配'],
      missingKeywords: ['JD关键技能', '业务领域关键词'],
      targetedAdvice: [
        '把 JD 中的核心技能写进项目经历和技能栈，形成可被检索的关键词',
        '在项目描述里增加“做了什么 + 带来什么结果”的表达',
      ],
    },
    optimization: {
      rewrittenHighlights: [
        '把职责型描述改写成成果型描述',
        '补充具体项目规模、指标和结果',
        '将技能堆砌改成“掌握程度 + 使用场景”',
      ],
      beforeAfter: [
        {
          before: '负责系统开发和维护',
          after: '负责核心系统模块开发与维护，优化关键流程并提升系统稳定性',
          reason: '更突出职责范围与结果',
        },
      ],
      fullDraft: '',
    },
    interview: {
      technicalQuestions: ['请介绍你在该岗位最熟悉的技术栈以及实际应用场景？'],
      projectQuestions: ['请讲一个最能体现你能力的项目，并说明你的贡献？'],
      behaviorQuestions: ['遇到需求变更或延期时，你通常如何处理？'],
      riskQuestions: ['简历中哪一段经历最需要你在面试中解释清楚？'],
    },
    career: {
      recommendedRoles: ['与当前技术栈相近的岗位'],
      levelAssessment: '当前简历更偏向中初级候选人，需要更多量化成果支撑。',
      skillGaps: ['核心业务场景经验', '更明确的技术深度', '可验证的业务结果'],
    },
    _parsed: false,
    _raw: raw,
  };

  if (parsed?.diagnosis && typeof parsed.diagnosis === 'object' && parsed.matching) {
    const merged = {
      ...fallback,
      ...parsed,
      diagnosis: { ...fallback.diagnosis, ...parsed.diagnosis, recommendations: { ...fallback.diagnosis.recommendations, ...(parsed.diagnosis.recommendations || {}) } },
      matching: { ...fallback.matching, ...parsed.matching, jdKeywords: { ...fallback.matching.jdKeywords, ...(parsed.matching.jdKeywords || {}) } },
      optimization: { ...fallback.optimization, ...parsed.optimization },
      interview: { ...fallback.interview, ...parsed.interview },
      career: { ...fallback.career, ...parsed.career },
      _parsed: true,
    };
    if (!merged.diagnosis.riskWarnings?.length) merged.diagnosis.riskWarnings = fallback.diagnosis.riskWarnings;
    if (!merged.diagnosis.missingSections?.length) merged.diagnosis.missingSections = fallback.diagnosis.missingSections;
    if (!merged.interview.technicalQuestions?.length) merged.interview.technicalQuestions = fallback.interview.technicalQuestions;
    if (!merged.career.recommendedRoles?.length) merged.career.recommendedRoles = fallback.career.recommendedRoles;
    return merged;
  }

  return {
    ...fallback,
    diagnosis: {
      ...fallback.diagnosis,
      recommendations: {
        ...fallback.diagnosis.recommendations,
        structure: [summary],
      },
    },
  };
}

async function analyzeResume({ resumeText, jobDescription }, { arkPostJson, textModel }) {
  const prompt = [
    '你是资深HR、ATS筛选系统专家、技术面试官与简历优化教练。根据岗位 JD 对简历做完整求职分析。',
    '必须只输出一个 JSON 对象，不要 Markdown，不要多余文字。',
    '请同时完成：JD关键词提取、岗位匹配、ATS兼容性检查、完整性检查、风险提示、简历改写、面试题生成、岗位方向建议。',
    'JSON 结构必须严格如下（分数为 0-100 的整数，数组控制在 3-8 项）：',
    JSON_SCHEMA_HINT,
    '',
    '岗位 JD：',
    jobDescription || '(空)',
    '',
    '简历文本：',
    resumeText || '(空)',
  ].join('\n');

  const url = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
  const respJson = await arkPostJson(url, {
    model: textModel,
    messages: [
      {
        role: 'system',
        content: '你只输出合法 JSON，字段名与示例完全一致。',
      },
      { role: 'user', content: prompt },
    ],
  });

  const raw = arkExtractMessageContent(respJson);
  const json = safeJsonParse(raw);
  return normalizeAnalysisResult(raw, json);
}

async function ocrImageToText(base64Png, { arkPostJson, vlModel }) {
  const prompt =
    '从图片提取简历文字，只返回 JSON：{"text":"..."}，不要 Markdown。图片内容：';
  const url = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
  const respJson = await arkPostJson(url, {
    model: vlModel,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: `data:image/png;base64,${base64Png}` } },
        ],
      },
    ],
  });
  const raw = arkExtractMessageContent(respJson);
  const parsed = safeJsonParse(raw);
  if (parsed?.text) return String(parsed.text).trim();
  if (typeof raw === 'string' && raw.trim() && !raw.trim().startsWith('{')) {
    return raw.trim();
  }
  return '';
}

module.exports = { analyzeResume, ocrImageToText, safeJsonParse, normalizeAnalysisResult };