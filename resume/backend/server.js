const express = require('express');
const cors = require('cors');
const multer = require('multer');
const dotenv = require('dotenv');
const { extractResumeText } = require('./services/ocr.service');
const { analyzeResume, ocrImageToText } = require('./services/analysis.service');
const { startInterview, chatInterview, evaluateInterview } = require('./services/interview.service');
const { generateRoadmap } = require('./services/career-roadmap.service');
const { tailorResume, buildResumeHtml, generatePDF, generateDOCX } = require('./services/tailor.service');
const {
  initDb,
  saveAnalysis,
  listHistory,
  listHistoryPaginated,
  deleteHistoryById,
  getHistoryById,
  toggleFavorite,
  getDashboard,
  getScoreTrend,
  getAllTags,
  createTag,
  deleteTag,
  getTagsByAnalysis,
  setAnalysisTags,
  addTagToAnalysis,
  removeTagFromAnalysis,
  getLatestPreview,
} = require('./db/database');

dotenv.config();

const app = express();
app.use(cors({ origin: true, credentials: true, optionsSuccessStatus: 200 }));
app.use(express.json({ limit: '1mb' }));

app.use((req, res, next) => {
  console.log(`[req] ${req.method} ${req.path} from ${req.headers.origin || 'unknown'}`);
  next();
});

const PORT = Number(process.env.PORT || 3000);
const MAX_PAGES_FOR_OCR = Number(process.env.MAX_PAGES_FOR_OCR || 3);
const ARK_API_KEY = process.env.ARK_API_KEY;
const DEEPSEEK_TEXT_MODEL = process.env.DEEPSEEK_TEXT_MODEL || 'DeepSeek-V4-flash';
const DEEPSEEK_VL_MODEL = process.env.DEEPSEEK_VL_MODEL || 'DeepSeek-V4-flash';

const db = initDb();

if (!ARK_API_KEY) {
  console.warn('[backend] 缺少 ARK_API_KEY，请在 .env 中配置。');
}

const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS || 120000);
const ANALYZE_TIMEOUT_MS = Number(process.env.ANALYZE_TIMEOUT_MS || 180000);

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label}超时（${ms / 1000}秒），请改用 DOCX 或稍后重试`)), ms)
    ),
  ]);
}

async function arkPostJson(url, body) {
  if (!ARK_API_KEY) throw new Error('缺少 ARK_API_KEY');
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ARK_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(AI_TIMEOUT_MS),
  });
  const text = await resp.text();
  if (!resp.ok) {
    const brief = text.length > 400 ? `${text.slice(0, 400)}…` : text;
    throw new Error(`Ark API 调用失败(${resp.status})：${brief}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Ark API 返回非 JSON：${text.slice(0, 200)}`);
  }
}

const aiDeps = {
  arkPostJson,
  textModel: DEEPSEEK_TEXT_MODEL,
  vlModel: DEEPSEEK_VL_MODEL,
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

/* Multer 在 Windows 上对中文文件名可能用 latin1 解析，这里统一还原为 UTF-8 */
function decodeUploadFilename(name) {
  if (!name) return name;
  // 如果包含典型的 latin1→utf8 乱码模式，进行转换
  if (/[À-ÿ]/.test(name) || /[Â-Ê]/.test(name)) {
    try {
      const decoded = Buffer.from(name, 'latin1').toString('utf8');
      // 检查解码后是否包含有效的中文字符
      if (/[一-鿿]/.test(decoded)) return decoded;
    } catch {}
  }
  return name;
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, db: !!db });
});

app.get('/api/preview/latest', (_req, res) => {
  if (!db) return res.json({ hasData: false });
  try {
    res.json(getLatestPreview(db));
  } catch (err) {
    console.error('[preview] 失败：', err?.message || err);
    res.json({ hasData: false });
  }
});

app.get('/api/dashboard', (_req, res) => {
  if (!db)
    return res.json({
      totalAnalyses: 0,
      avgMatchScore: 0,
      avgStructureScore: 0,
      recentCount: 0,
      weeklyData: [],
      bestAnalysis: null,
      topMissingKeywords: [],
    });
  res.json(getDashboard(db));
});

app.get('/api/score-trend', (_req, res) => {
  if (!db) return res.json([]);
  res.json(getScoreTrend(db));
});

app.get('/api/history', (req, res) => {
  if (!db) return res.json({ list: [], total: 0 });
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(50, Math.max(5, Number(req.query.pageSize) || 10));
  const offset = (page - 1) * pageSize;
  const favoritesOnly = req.query.favorites === '1';
  const search = String(req.query.search || '').trim();
  const minScore = Math.max(0, Number(req.query.minScore) || 0);
  const tagId = Number(req.query.tagId) || 0;
  const result = listHistoryPaginated(db, page, pageSize, offset, favoritesOnly, search, minScore, tagId);
  res.json(result);
});

app.delete('/api/history/:id', (req, res) => {
  if (!db) return res.status(503).json({ error: '数据库未就绪' });
  const deleted = deleteHistoryById(db, Number(req.params.id));
  if (!deleted) return res.status(404).json({ error: '记录不存在' });
  res.json({ success: true });
});

app.get('/api/history/:id', (req, res) => {
  if (!db) return res.status(503).json({ error: '数据库未就绪' });
  const row = getHistoryById(db, Number(req.params.id));
  if (!row) return res.status(404).json({ error: '记录不存在' });
  res.json(row);
});

app.post('/api/history/:id/favorite', (req, res) => {
  if (!db) return res.status(503).json({ error: '数据库未就绪' });
  const result = toggleFavorite(db, Number(req.params.id));
  if (result === null) return res.status(404).json({ error: '记录不存在' });
  res.json({ isFavorite: result === 1 });
});

app.post('/api/analyze', upload.single('file'), async (req, res) => {
  const started = Date.now();
  try {
    if (!ARK_API_KEY) {
      return res.status(500).json({ error: '缺少 ARK_API_KEY，请在 backend/.env 配置' });
    }

    const jobDescription = String(req.body?.jobDescription || '').trim();
    const jobTitle = String(req.body?.jobTitle || '').trim();
    const file = req.file;
    if (!file) return res.status(400).json({ error: '缺少上传文件：file' });
    file.originalname = decodeUploadFilename(file.originalname);

    console.log(`[analyze] 开始 file=${file.originalname} type=${file.mimetype}`);

    const resumeText = await withTimeout(
      extractResumeText(file, {
        maxPages: MAX_PAGES_FOR_OCR,
        ocrPageTimeoutMs: AI_TIMEOUT_MS,
        ocrImageToText: (b64) => ocrImageToText(b64, aiDeps),
      }),
      ANALYZE_TIMEOUT_MS,
      '简历文字提取'
    );
    console.log(`[analyze] 文字提取完成 len=${resumeText.length} ms=${Date.now() - started}`);

    if (!resumeText) {
      return res.status(400).json({
        error:
          '未能从简历中提取有效文字。扫描版 PDF 需安装 Poppler；建议先改用 DOCX 测试。',
      });
    }

    const result = await withTimeout(
      analyzeResume({ resumeText, jobDescription }, aiDeps),
      AI_TIMEOUT_MS,
      'AI 分析'
    );
    console.log(`[analyze] AI 完成 ms=${Date.now() - started}`);

    if (db) {
      console.log('[db] 开始保存分析记录...');
      try {
        const id = saveAnalysis(db, {
          fileName: file.originalname,
          mimeType: file.mimetype,
          jobTitle,
          jobDescription,
          resumeText,
          result,
        });
        console.log(`[db] 分析记录已保存，ID: ${id}`);
      } catch (dbErr) {
        console.error('[db] 保存失败:', dbErr);
      }
    } else {
      console.warn('[db] 数据库未初始化，无法保存记录');
    }

    console.log(`[analyze] 响应发送开始 ms=${Date.now() - started}`);
    res.json(result);
    console.log(`[analyze] 响应发送完成 ms=${Date.now() - started}`);
  } catch (err) {
    console.error('[analyze] 失败：', err?.message || err);
    return res.status(500).json({ error: err?.message || String(err) });
   }
 });

app.get('/api/tags', (_req, res) => {
  if (!db) return res.status(503).json({ error: '数据库未就绪' });
  res.json(getAllTags(db));
});

app.post('/api/tags', (req, res) => {
  if (!db) return res.status(503).json({ error: '数据库未就绪' });
  const { name, color } = req.body;
  if (!name) return res.status(400).json({ error: '标签名称不能为空' });
  const tag = createTag(db, name, color || '#3b82f6');
  if (!tag) return res.status(400).json({ error: '标签已存在' });
  res.json(tag);
});

app.delete('/api/tags/:id', (req, res) => {
  if (!db) return res.status(503).json({ error: '数据库未就绪' });
  deleteTag(db, Number(req.params.id));
  res.json({ success: true });
});

app.get('/api/history/:id/tags', (req, res) => {
  if (!db) return res.status(503).json({ error: '数据库未就绪' });
  res.json(getTagsByAnalysis(db, Number(req.params.id)));
});

app.post('/api/history/:id/tags', (req, res) => {
  if (!db) return res.status(503).json({ error: '数据库未就绪' });
  const { tagIds } = req.body;
  if (!Array.isArray(tagIds)) return res.status(400).json({ error: 'tagIds 必须是数组' });
  res.json(setAnalysisTags(db, Number(req.params.id), tagIds));
});

app.post('/api/history/:id/tags/:tagId', (req, res) => {
  if (!db) return res.status(503).json({ error: '数据库未就绪' });
  res.json(addTagToAnalysis(db, Number(req.params.id), Number(req.params.tagId)));
});

app.delete('/api/history/:id/tags/:tagId', (req, res) => {
  if (!db) return res.status(503).json({ error: '数据库未就绪' });
  res.json(removeTagFromAnalysis(db, Number(req.params.id), Number(req.params.tagId)));
});

// ========== 面试模拟 API ==========

app.post('/api/interview/start', upload.single('file'), async (req, res) => {
  try {
    if (!ARK_API_KEY) {
      return res.status(500).json({ error: '缺少 ARK_API_KEY，请在 backend/.env 配置' });
    }

    const jobDescription = String(req.body?.jobDescription || '').trim();
    const jobTitle = String(req.body?.jobTitle || '').trim();
    const file = req.file;
    if (file) file.originalname = decodeUploadFilename(file.originalname);

    let resumeText = String(req.body?.resumeText || '').trim();

    if (file) {
      console.log(`[interview] 提取简历文字 file=${file.originalname}`);
      resumeText = await withTimeout(
        extractResumeText(file, {
          maxPages: MAX_PAGES_FOR_OCR,
          ocrPageTimeoutMs: AI_TIMEOUT_MS,
          ocrImageToText: (b64) => ocrImageToText(b64, aiDeps),
        }),
        ANALYZE_TIMEOUT_MS,
        '简历文字提取'
      );
    }

    if (!resumeText) {
      return res.status(400).json({ error: '未能获取简历文字，请上传简历文件或输入简历内容' });
    }

    const result = await withTimeout(
      startInterview({ resumeText, jobDescription }, aiDeps),
      AI_TIMEOUT_MS,
      '面试题生成'
    );

    res.json(result);
  } catch (err) {
    console.error('[interview/start] 失败：', err?.message || err);
    res.status(500).json({ error: err?.message || String(err) });
  }
});

app.post('/api/interview/chat', async (req, res) => {
  try {
    if (!ARK_API_KEY) {
      return res.status(500).json({ error: '缺少 ARK_API_KEY' });
    }

    const { messages, questionPool, focusAreas } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: '缺少对话历史 messages' });
    }

    const result = await withTimeout(
      chatInterview({ messages, questionPool, focusAreas }, aiDeps),
      AI_TIMEOUT_MS,
      '面试对话'
    );

    res.json(result);
  } catch (err) {
    console.error('[interview/chat] 失败：', err?.message || err);
    res.status(500).json({ error: err?.message || String(err) });
  }
});

app.post('/api/interview/evaluate', async (req, res) => {
  try {
    if (!ARK_API_KEY) {
      return res.status(500).json({ error: '缺少 ARK_API_KEY' });
    }

    const { messages } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: '缺少对话历史 messages' });
    }

    const result = await withTimeout(
      evaluateInterview({ messages }, aiDeps),
      AI_TIMEOUT_MS,
      '面试评估'
    );

    res.json(result);
  } catch (err) {
    console.error('[interview/evaluate] 失败：', err?.message || err);
    res.status(500).json({ error: err?.message || String(err) });
  }
});

// ========== 职业路线图 API ==========
app.post('/api/career-roadmap', upload.single('file'), async (req, res) => {
  try {
    if (!ARK_API_KEY) {
      return res.status(500).json({ error: '缺少 ARK_API_KEY，请在 backend/.env 配置' });
    }

    const targetRole = String(req.body?.targetRole || '').trim();
    const targetCompany = String(req.body?.targetCompany || '').trim();
    const file = req.file;
    if (file) file.originalname = decodeUploadFilename(file.originalname);

    let resumeText = String(req.body?.resumeText || '').trim();

    if (file) {
      console.log(`[roadmap] 提取简历文字 file=${file.originalname}`);
      resumeText = await withTimeout(
        extractResumeText(file, {
          maxPages: MAX_PAGES_FOR_OCR,
          ocrPageTimeoutMs: AI_TIMEOUT_MS,
          ocrImageToText: (b64) => ocrImageToText(b64, aiDeps),
        }),
        ANALYZE_TIMEOUT_MS,
        '简历文字提取'
      );
    }

    if (!resumeText) {
      return res.status(400).json({ error: '未能获取简历文字，请上传简历文件或输入简历内容' });
    }

    if (!targetRole) {
      return res.status(400).json({ error: '请输入目标岗位' });
    }

    const result = await withTimeout(
      generateRoadmap({ resumeText, targetRole, targetCompany }, aiDeps),
      AI_TIMEOUT_MS,
      '路线图生成'
    );

    res.json(result);
  } catch (err) {
    console.error('[roadmap] 失败：', err?.message || err);
    res.status(500).json({ error: err?.message || String(err) });
  }
});

// ========== 简历精修 API ==========
app.post('/api/tailor', upload.single('file'), async (req, res) => {
  try {
    if (!ARK_API_KEY) {
      return res.status(500).json({ error: '缺少 ARK_API_KEY，请在 backend/.env 配置' });
    }

    const jobDescription = String(req.body?.jobDescription || '').trim();
    const file = req.file;
    if (file) file.originalname = decodeUploadFilename(file.originalname);

    let resumeText = String(req.body?.resumeText || '').trim();

    if (file) {
      console.log(`[tailor] 提取简历文字 file=${file.originalname}`);
      resumeText = await withTimeout(
        extractResumeText(file, {
          maxPages: MAX_PAGES_FOR_OCR,
          ocrPageTimeoutMs: AI_TIMEOUT_MS,
          ocrImageToText: (b64) => ocrImageToText(b64, aiDeps),
        }),
        ANALYZE_TIMEOUT_MS,
        '简历文字提取'
      );
    }

    if (!resumeText) {
      return res.status(400).json({ error: '未能获取简历文字，请上传简历文件或输入简历内容' });
    }

    if (!jobDescription) {
      return res.status(400).json({ error: '请粘贴岗位描述（JD）' });
    }

    const result = await withTimeout(
      tailorResume({ resumeText, jobDescription }, aiDeps),
      AI_TIMEOUT_MS,
      '简历精修'
    );

    res.json(result);
  } catch (err) {
    console.error('[tailor] 失败：', err?.message || err);
    res.status(500).json({ error: err?.message || String(err) });
  }
});

app.post('/api/tailor/export', async (req, res) => {
  try {
    const { resumeText, format, jobTitle } = req.body;

    if (!resumeText) {
      return res.status(400).json({ error: '缺少简历文本' });
    }

    if (format === 'pdf') {
      const pdfBuf = await generatePDF(resumeText, jobTitle);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="tailored-resume.pdf"');
      res.send(pdfBuf);
    } else if (format === 'docx') {
      const docxBuf = await generateDOCX(resumeText, jobTitle);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', 'attachment; filename="tailored-resume.docx"');
      res.send(docxBuf);
    } else if (format === 'html') {
      const html = buildResumeHtml(resumeText, jobTitle);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    } else {
      return res.status(400).json({ error: '不支持的格式，可选：pdf / docx / html' });
    }
  } catch (err) {
    console.error('[tailor/export] 失败：', err?.message || err);
    res.status(500).json({ error: err?.message || String(err) });
  }
});

const server = app.listen(PORT, () => {
  console.log(`[gateway] http://localhost:${PORT}`);
  console.log(`[data-service] SQLite: ${db ? 'ready' : 'disabled'}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `[gateway] 端口 ${PORT} 已被占用。请先关闭之前的 node/nodemon，或在 PowerShell 执行：\n` +
        `  netstat -ano | findstr :${PORT}\n` +
        `  taskkill /PID <最后一列PID> /F`
    );
  } else {
    console.error('[gateway] 启动失败：', err.message);
  }
  process.exit(1);
});