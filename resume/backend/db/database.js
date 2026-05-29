const fs = require('fs');
const path = require('path');

let Database;
try {
  Database = require('better-sqlite3');
} catch {
  Database = null;
}

const DB_PATH = path.join(__dirname, 'resumemind.db');

function initDb() {
  if (!Database) {
    console.warn('[db] 未安装 better-sqlite3，历史记录功能将不可用。请运行 npm install');
    return null;
  }
  const db = new Database(DB_PATH);
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema);

  const columns = db.prepare("PRAGMA table_info(analyses)").all();
  const hasFavorite = columns.some(c => c.name === 'is_favorite');
  if (!hasFavorite) {
    console.log('[db] 迁移：添加 is_favorite 字段');
    db.exec("ALTER TABLE analyses ADD COLUMN is_favorite INTEGER DEFAULT 0");
  }

  const count = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  if (count === 0) {
    const seed = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8');
    db.exec(seed);
  }
  return db;
}

function saveAnalysis(db, payload) {
  const insertJob = db.prepare(
    'INSERT INTO job_posts (title, industry, description) VALUES (?, ?, ?)'
  );
  const jobInfo = insertJob.run(
    payload.jobTitle || '未命名岗位',
    '互联网',
    payload.jobDescription
  );

  const insertResume = db.prepare(
    'INSERT INTO resume_files (user_id, file_name, mime_type, extracted_text) VALUES (1, ?, ?, ?)'
  );
  const resumeInfo = insertResume.run(
    payload.fileName,
    payload.mimeType,
    payload.resumeText
  );

  const d = payload.result?.diagnosis || {};
  const m = payload.result?.matching || {};
  const insertAnalysis = db.prepare(`
    INSERT INTO analyses (resume_id, job_id, structure_score, expression_score, quant_score, match_score, result_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const analysisInfo = insertAnalysis.run(
    resumeInfo.lastInsertRowid,
    jobInfo.lastInsertRowid,
    d.structureScore ?? 0,
    d.expressionScore ?? 0,
    d.quantScore ?? 0,
    m.matchScore ?? 0,
    JSON.stringify(payload.result)
  );

  const insertKw = db.prepare(
    'INSERT INTO keywords (analysis_id, keyword, match_type) VALUES (?, ?, ?)'
  );
  for (const k of m.matchedKeywords || []) {
    insertKw.run(analysisInfo.lastInsertRowid, k, 'matched');
  }
  for (const k of m.missingKeywords || []) {
    insertKw.run(analysisInfo.lastInsertRowid, k, 'missing');
  }

  return analysisInfo.lastInsertRowid;
}

function listHistory(db) {
  console.log('[db] 查询历史记录...');
  const result = db
    .prepare(
      `SELECT a.id, rf.file_name AS fileName, jp.title AS jobTitle,
              a.match_score AS matchScore, a.structure_score AS structureScore, a.created_at AS createdAt
       FROM analyses a
       JOIN resume_files rf ON rf.id = a.resume_id
       JOIN job_posts jp ON jp.id = a.job_id
       ORDER BY a.id DESC LIMIT 50`
    )
    .all();
  console.log(`[db] 找到 ${result.length} 条历史记录`);
  return result;
}

function listHistoryPaginated(db, page, pageSize, offset, favoritesOnly = false) {
  let total, list;
  if (favoritesOnly) {
    total = db.prepare('SELECT COUNT(*) AS c FROM analyses WHERE is_favorite = 1').get().c;
    list = db
      .prepare(
        `SELECT a.id, rf.file_name AS fileName, jp.title AS jobTitle,
                a.match_score AS matchScore, a.structure_score AS structureScore,
                a.is_favorite AS isFavorite, a.created_at AS createdAt
         FROM analyses a
         JOIN resume_files rf ON rf.id = a.resume_id
         JOIN job_posts jp ON jp.id = a.job_id
         WHERE a.is_favorite = 1
         ORDER BY a.id DESC LIMIT ? OFFSET ?`
      )
      .all(pageSize, offset);
  } else {
    total = db.prepare('SELECT COUNT(*) AS c FROM analyses').get().c;
    list = db
      .prepare(
        `SELECT a.id, rf.file_name AS fileName, jp.title AS jobTitle,
                a.match_score AS matchScore, a.structure_score AS structureScore,
                a.is_favorite AS isFavorite, a.created_at AS createdAt
         FROM analyses a
         JOIN resume_files rf ON rf.id = a.resume_id
         JOIN job_posts jp ON jp.id = a.job_id
         ORDER BY a.id DESC LIMIT ? OFFSET ?`
      )
      .all(pageSize, offset);
  }
  return { list, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

function deleteHistoryById(db, id) {
  db.prepare('DELETE FROM keywords WHERE analysis_id = ?').run(id);
  const result = db.prepare('DELETE FROM analyses WHERE id = ?').run(id);
  return result.changes > 0;
}

function getHistoryById(db, id) {
  const row = db
    .prepare(
      `SELECT a.id, rf.file_name AS fileName, jp.title AS jobTitle,
              a.match_score AS matchScore, a.structure_score AS structureScore,
              a.is_favorite AS isFavorite,
              a.result_json AS resultJson, a.created_at AS createdAt
       FROM analyses a
       JOIN resume_files rf ON rf.id = a.resume_id
       JOIN job_posts jp ON jp.id = a.job_id
       WHERE a.id = ?`
    )
    .get(id);
  if (!row) return null;
  return {
    ...row,
    result: JSON.parse(row.resultJson || '{}'),
  };
}

function toggleFavorite(db, id) {
  const current = db.prepare('SELECT is_favorite FROM analyses WHERE id = ?').get(id);
  if (!current) return null;
  const newValue = current.is_favorite ? 0 : 1;
  db.prepare('UPDATE analyses SET is_favorite = ? WHERE id = ?').run(newValue, id);
  return newValue;
}

function getDashboard(db) {
  const total = db.prepare('SELECT COUNT(*) AS c FROM analyses').get().c;
  const avg = db
    .prepare(
      'SELECT AVG(match_score) AS m, AVG(structure_score) AS s FROM analyses'
    )
    .get();
  const recent = db
    .prepare(
      `SELECT COUNT(*) AS c FROM analyses WHERE datetime(created_at) >= datetime('now', '-7 days')`
    )
    .get().c;

  const weekly = db
    .prepare(
      `SELECT date(created_at) AS date, COUNT(*) AS count
       FROM analyses
       WHERE datetime(created_at) >= datetime('now', '-6 days')
       GROUP BY date(created_at)
       ORDER BY date ASC`
    )
    .all();

  const dayMap = {};
  for (const row of weekly) {
    dayMap[row.date] = row.count;
  }

  const today = new Date();
  const dayLabels = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const result = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayOfWeek = dayLabels[d.getDay()];
    result.push({
      label: dayOfWeek,
      count: dayMap[dateStr] || 0,
    });
  }

  return {
    totalAnalyses: total,
    avgMatchScore: avg.m || 0,
    avgStructureScore: avg.s || 0,
    recentCount: recent,
    weeklyData: result,
  };
}

module.exports = { initDb, saveAnalysis, listHistory, listHistoryPaginated, deleteHistoryById, getHistoryById, toggleFavorite, getDashboard, DB_PATH };
