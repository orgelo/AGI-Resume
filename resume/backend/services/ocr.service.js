const fs = require('fs');
const os = require('os');
const path = require('path');
const mammoth = require('mammoth');
const { fromPath } = require('pdf2pic');

async function extractDocxTextFromBuffer(buffer) {
  const result = await mammoth.extractRawText({ buffer });
  return String(result.value || '').trim();
}

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label}超时（${ms / 1000}秒）`)), ms)
    ),
  ]);
}

async function extractPdfTextFromBuffer(pdfBuffer, { ocrImageToText, maxPages, ocrPageTimeoutMs }) {
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'resumemind-'));
  const pdfPath = path.join(tmpDir, 'resume.pdf');
  await fs.promises.writeFile(pdfPath, pdfBuffer);

  const converter = fromPath(pdfPath, {
    density: 220,
    format: 'png',
    savePath: tmpDir,
    saveFilename: 'page',
  });

  const pageLimit = maxPages || 3;
  const pageTimeout = ocrPageTimeoutMs || 90000;

  let pages;
  try {
    pages = await withTimeout(converter.bulk(pageLimit), pageTimeout, 'PDF 转图片');
  } catch (err) {
    throw new Error(
      'PDF 转图片失败：请安装 poppler（pdftoppm）并加入 PATH。' + (err?.message || String(err))
    );
  }

  let combined = '';
  for (const p of pages) {
    const imgPath = p?.path || p?.filename || p?.filePath;
    if (!imgPath) continue;
    const imgBuf = await fs.promises.readFile(imgPath);
    const base64 = imgBuf.toString('base64');
    const pageText = await withTimeout(
      ocrImageToText(base64),
      pageTimeout,
      `第 ${p.page || '?'} 页 OCR`
    );
    if (pageText) combined += `\n\n[Page ${p.page || ''}]\n${pageText}`;
  }
  return combined.trim();
}

async function extractResumeText(file, deps = {}) {
  const mimetype = file.mimetype || '';
  const originalName = file.originalname || '';

  if (mimetype === 'application/pdf' || originalName.toLowerCase().endsWith('.pdf')) {
    return extractPdfTextFromBuffer(file.buffer, deps);
  }
  if (
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    originalName.toLowerCase().endsWith('.docx')
  ) {
    return extractDocxTextFromBuffer(file.buffer);
  }
  throw new Error('暂时只支持 PDF(含扫描件) 和 DOCX');
}

module.exports = { extractResumeText };
