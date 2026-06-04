/**
 * Resume Tailoring Agent 服务
 * 根据 JD 优化简历：提取关键词、匹配项目、强化表达、重排序经历
 * 规则：不得伪造经历、不得新增不存在内容，仅重写表达/优化结构/强化关键词
 */
const { safeJsonParse, arkExtractMessageContent } = require('./analysis.service');
const PDFDocument = require('pdfkit');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = require('docx');

async function tailorResume({ resumeText, jobDescription }, { arkPostJson, textModel }) {
  const prompt = [
    '你是一位顶级简历优化专家。请根据以下JD优化简历。',
    '',
    '## 严格规则',
    '1. 不得伪造经历、不得新增不存在的内容',
    '2. 不得编造项目、技能、成果',
    '3. 只能：重写表达、优化结构、强化匹配JD的关键词',
    '4. 每个修改点必须在changes中标注修改理由',
    '',
    '## 任务',
    '1. 提取JD核心关键词',
    '2. 将简历中的经历与JD要求进行匹配',
    '3. 用更专业、更匹配JD的表达重写（不改变事实）',
    '4. 按JD相关性重新排列经历顺序',
    '5. 在简历中适度强化JD关键词的自然植入',
    '',
    '## 岗位JD',
    jobDescription || '(空)',
    '',
    '## 原始简历',
    resumeText || '(空)',
    '',
    '## 输出格式',
    '必须只输出JSON：',
    '{',
    '  "jdKeywords": {',
    '    "mustHave": ["必须技能1", "必须技能2"],',
    '    "niceToHave": ["加分技能1"],',
    '    "softSkills": ["软技能1"]',
    '  },',
    '  "matchAnalysis": {',
    '    "matched": ["简历中匹配JD的点1", "匹配点2"],',
    '    "partialMatch": ["部分匹配点1"],',
    '    "missing": ["缺少的要素1"]',
    '  },',
    '  "changes": [',
    '    { "original": "原始描述（截取关键句）", "rewritten": "优化后描述", "reason": "修改理由", "type": "keyword|expression|structure|order" }',
    '  ],',
    '  "tailoredResume": "优化后的完整简历文本",',
    '  "summary": "本次优化总结（2-3句话）"',
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

  if (parsed && parsed.tailoredResume) {
    return parsed;
  }

  return {
    jdKeywords: {
      mustHave: [],
      niceToHave: [],
      softSkills: [],
    },
    matchAnalysis: {
      matched: [],
      partialMatch: [],
      missing: [],
    },
    changes: [],
    tailoredResume: resumeText,
    summary: 'AI 分析未返回有效结果，请稍后重试或手动编辑。',
  };
}

function buildResumeHtml(tailoredResume, jobTitle) {
  const safeText = (tailoredResume || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const lines = safeText.split('\n').map(l => l.trim());
  let html = `<!DOCTYPE html>
<html lang="zh">
<head><meta charset="UTF-8"><title>专属简历${jobTitle ? ' - ' + jobTitle : ''}</title>
<style>
  body { font-family: "Microsoft YaHei","PingFang SC","Noto Sans SC",sans-serif; color:#222; line-height:1.6; margin:0; padding:20px 30px; }
  h1 { font-size:22px; margin-bottom:4px; }
  h2 { font-size:16px; border-bottom:2px solid #2c3e50; padding-bottom:4px; margin-top:18px; }
  h3 { font-size:14px; margin-bottom:0; }
  p,li { font-size:13px; margin:2px 0; }
  ul { padding-left:18px; margin:4px 0; }
  .header { text-align:center; border-bottom:1px solid #aaa; padding-bottom:10px; margin-bottom:12px; }
  .header p { font-size:12px; color:#555; }
  .badge { display:inline-block; background:#2c3e50; color:#fff; font-size:11px; padding:1px 6px; border-radius:3px; margin-right:4px; }
  .section { margin-bottom:14px; }
</style></head><body>
<div class="header">
`;
  // Parase sections
  const sections = [];
  let currentSection = '';
  let currentLines = [];
  for (const line of lines) {
    if (!line) continue;
    if (line.startsWith('【') || line.startsWith('## ') || line.startsWith('# ') || /^[一二三四五六七八九十]【、]/.test(line) || /^[0-9]+【、.]/.test(line) || line === line.replace(/[a-zA-Z\u4e00-\u9fa5]/g, '') && line.length < 15 && line.length > 2) {
      if (currentLines.length > 0) {
        sections.push({ title: currentSection, lines: currentLines });
      }
      currentSection = line.replace(/^[#【\s0-9一二三四五六七八九十、. ]+/g, '').trim();
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }
  if (currentLines.length > 0) {
    sections.push({ title: currentSection, lines: currentLines });
  }

  for (const sec of sections) {
    if (sec.title) {
      html += `<h2>${sec.title}</h2>\n`;
    }
    for (const l of sec.lines) {
      if (l.startsWith('•') || l.startsWith('-') || l.startsWith('·')) {
        html += `<li>${l.replace(/^[•\-·]\s*/, '')}</li>\n`;
      } else if (l.startsWith('  •') || l.startsWith('  -')) {
        html += `<li>${l.replace(/^  [•\-·]\s*/, '')}</li>\n`;
      } else {
        html += `<p>${l}</p>\n`;
      }
    }
  }

  html += '</body></html>';
  return html;
}

function generatePDF(resumeText, jobTitle) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      doc.font('Helvetica-Bold').fontSize(18).text('专属简历' + (jobTitle ? ` - ${jobTitle}` : ''), { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica').fillColor('#666').text(jobTitle || '', { align: 'center' });
      doc.moveDown(1);
      doc.fillColor('#222');

      const lines = (resumeText || '').split('\n').map(l => l.trim());
      for (const line of lines) {
        if (!line) {
          doc.moveDown(0.3);
          continue;
        }
        if (/^[#【\s0-9一二三四五六七八九十、. ]*[^\s#【]/.test(line) && line.length < 20 && !line.startsWith('•') && !line.startsWith('-')) {
          doc.moveDown(0.5);
          doc.font('Helvetica-Bold').fontSize(13).fillColor('#2c3e50').text(line);
          doc.moveDown(0.2);
          doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#2c3e50').lineWidth(1.5).stroke();
          doc.moveDown(0.3);
          doc.font('Helvetica').fontSize(10).fillColor('#222');
        } else {
          doc.fontSize(10).text('  ' + line, { indent: 0 });
        }
      }

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

function generateDOCX(resumeText, jobTitle) {
  const lines = (resumeText || '').split('\n').map(l => l.trim());
  const children = [];

  // Title
  children.push(
    new Paragraph({
      text: '专属简历' + (jobTitle ? ` - ${jobTitle}` : ''),
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
    })
  );

  for (const line of lines) {
    if (!line) {
      children.push(new Paragraph({ spacing: { after: 60 }, children: [] }));
      continue;
    }
    if (/^[#【\s0-9一二三四五六七八九十、. ]*[^\s#【]/.test(line) && line.length < 20 && !line.startsWith('•') && !line.startsWith('-')) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 80 },
          children: [new TextRun({ text: line, bold: true, size: 26, color: '2c3e50' })],
        })
      );
    } else {
      children.push(
        new Paragraph({
          spacing: { after: 40 },
          children: [new TextRun({ text: line.replace(/^[•\-·]\s*/, '• '), size: 20 })],
        })
      );
    }
  }

  const doc = new Document({
    sections: [{ properties: {}, children }],
  });

  return Packer.toBuffer(doc);
}

module.exports = { tailorResume, buildResumeHtml, generatePDF, generateDOCX };