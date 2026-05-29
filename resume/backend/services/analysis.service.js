const JSON_SCHEMA_HINT = `{
  "diagnosis": {
    "structureScore": 0,
    "expressionScore": 0,
    "quantScore": 0,
    "recommendations": { "structure": [], "expression": [], "quant": [] }
  },
  "matching": {
    "matchScore": 0,
    "matchedKeywords": [],
    "missingKeywords": [],
    "targetedAdvice": []
  },
  "optimization": { "rewrittenHighlights": [] }
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
  if (parsed?.diagnosis && typeof parsed.diagnosis === 'object' && parsed.matching) {
    return parsed;
  }

  const summary =
    typeof parsed?.diagnosis === 'string'
      ? parsed.diagnosis
      : typeof raw === 'string'
        ? raw.slice(0, 500)
        : 'AI 返回格式异常，请重试或换用 DOCX 简历。';

  return {
    diagnosis: {
      structureScore: 0,
      expressionScore: 0,
      quantScore: 0,
      recommendations: {
        structure: [summary],
        expression: [],
        quant: [],
      },
    },
    matching: {
      matchScore: 0,
      matchedKeywords: [],
      missingKeywords: [],
      targetedAdvice: ['请检查 Ark API 模型返回是否为标准 JSON'],
    },
    optimization: { rewrittenHighlights: [] },
    _parsed: false,
    _raw: raw,
  };
}

async function analyzeResume({ resumeText, jobDescription }, { arkPostJson, textModel }) {
  const prompt = [
    '你是资深HR与简历优化教练。根据岗位 JD 对简历做诊断、匹配评估与优化建议。',
    '必须只输出一个 JSON 对象，不要 Markdown，不要多余文字。',
    'JSON 结构必须严格如下（分数为 0-100 的整数）：',
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