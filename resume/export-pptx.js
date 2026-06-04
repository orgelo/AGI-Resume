/**
 * Export ResumeMind HTML presentation → PPTX.
 *
 * Usage:  node export-pptx.js
 * Deps:   auto-installed on first run (playwright + pptxgenjs)
 *         playwright will download Chromium (~150 MB, once).
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');

const HTML_FILE = path.join(__dirname, 'resumemind-presentation.html');
const OUTPUT_FILE = path.join(__dirname, 'ResumeMind-项目汇报.pptx');
const PORT = 9876;

// ── helpers ──────────────────────────────────────────────
function ensure(pkgName) {
  try { require.resolve(pkgName); } catch {
    console.log(`[install] ${pkgName} ...`);
    execSync(`npm install --no-save ${pkgName}`, { cwd: __dirname, stdio: 'inherit' });
  }
}

console.log('[check] 检查依赖...');
ensure('playwright');
ensure('pptxgenjs');

// ensure chromium
const { execSync: run } = require('child_process');
try {
  require('playwright');  // just verify it resolves
} catch { /* handled above */ }

console.log('[server] 启动 HTTP 服务...');
const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
};

const server = http.createServer((req, res) => {
  let filePath = path.join(__dirname, req.url === '/' ? 'resumemind-presentation.html' : req.url);
  const ext = path.extname(filePath).toLowerCase();
  try {
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
});
server.listen(PORT);

// ── Screenshot each slide ──────────────────────────────
(async () => {
  const { chromium } = require('playwright');
  const PptxGenJS = require('pptxgenjs');

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto(`http://localhost:${PORT}/resumemind-presentation.html`, { waitUntil: 'networkidle' });
  // Wait extra for Google Fonts to fully render
  await page.waitForTimeout(2000);
  await page.evaluate(() => document.fonts.ready);

  const total = await page.evaluate(() => document.querySelectorAll('.s').length);
  console.log(`[slides] 共 ${total} 页，开始截图...`);

  const screenshots = [];
  for (let i = 0; i < total; i++) {
    // show only slide i
    await page.evaluate((idx) => {
      document.querySelectorAll('.s').forEach((s, j) => {
        s.classList.toggle('on', j === idx);
      });
    }, i);
    await page.waitForTimeout(500); // let CSS animations + fonts settle

    const el = await page.$('.stage');
    const buf = el ? await el.screenshot({ type: 'png' }) : await page.screenshot({ type: 'png' });
    screenshots.push(buf);
    process.stdout.write(`\r  [${i + 1}/${total}] ✓`);
  }
  console.log('');

  await browser.close();
  server.close();
  console.log('[server] 已关闭');

  // ── Build PPTX ──────────────────────────────────────
  console.log('[pptx] 生成 PPTX 文件...');
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'WIDE', width: 13.333, height: 7.5 });
  pptx.layout = 'WIDE';

  for (let i = 0; i < screenshots.length; i++) {
    const slide = pptx.addSlide();
    slide.addImage({
      data: `data:image/png;base64,${screenshots[i].toString('base64')}`,
      x: 0, y: 0,
      w: '13.333', h: '7.5',
    });
  }

  await pptx.writeFile({ fileName: OUTPUT_FILE });
  console.log(`\n✅ 导出完成: ${OUTPUT_FILE}`);
  console.log(`   共 ${screenshots.length} 页`);
})().catch(err => {
  console.error('[error]', err.message);
  server.close();
  process.exit(1);
});
