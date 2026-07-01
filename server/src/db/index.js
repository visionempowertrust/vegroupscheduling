import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const DB_PATH = process.env.DB_PATH || './data/feedback.db';

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submitter_name TEXT,
    site_name TEXT,
    language_code TEXT,
    audio_filename TEXT NOT NULL,
    audio_mime_type TEXT,
    transcript TEXT,
    transcription_status TEXT NOT NULL DEFAULT 'pending',
    transcription_error TEXT,
    review_status TEXT NOT NULL DEFAULT 'new',
    admin_notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

export function insertFeedback(entry) {
  const stmt = db.prepare(`
    INSERT INTO feedback (
      submitter_name, site_name, language_code, audio_filename, audio_mime_type,
      transcript, transcription_status, transcription_error
    ) VALUES (@submitter_name, @site_name, @language_code, @audio_filename, @audio_mime_type,
      @transcript, @transcription_status, @transcription_error)
  `);
  const info = stmt.run(entry);
  return getFeedbackById(info.lastInsertRowid);
}

export function getFeedbackById(id) {
  return db.prepare('SELECT * FROM feedback WHERE id = ?').get(id);
}

export function listFeedback({ language_code, review_status, from, to } = {}) {
  let query = 'SELECT * FROM feedback WHERE 1=1';
  const params = [];

  if (language_code) {
    query += ' AND language_code = ?';
    params.push(language_code);
  }
  if (review_status) {
    query += ' AND review_status = ?';
    params.push(review_status);
  }
  if (from) {
    query += ' AND created_at >= ?';
    params.push(from);
  }
  if (to) {
    query += ' AND created_at <= ?';
    params.push(to);
  }

  query += ' ORDER BY created_at DESC';
  return db.prepare(query).all(...params);
}

export function updateFeedback(id, { review_status, admin_notes }) {
  const existing = getFeedbackById(id);
  if (!existing) return null;

  db.prepare(`
    UPDATE feedback
    SET review_status = COALESCE(@review_status, review_status),
        admin_notes = COALESCE(@admin_notes, admin_notes),
        updated_at = datetime('now')
    WHERE id = @id
  `).run({ id, review_status: review_status ?? null, admin_notes: admin_notes ?? null });

  return getFeedbackById(id);
}
