import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { upload, UPLOAD_DIR_PATH } from '../middleware/upload.js';
import { db, insertFeedback, listFeedback, getFeedbackById, updateFeedback } from '../db/index.js';
import { transcribeAudio, SUPPORTED_LANGUAGES } from '../services/sarvam.js';

export const router = express.Router();

router.get('/languages', (req, res) => {
  res.json(SUPPORTED_LANGUAGES);
});

router.get('/', (req, res) => {
  const { language_code, review_status, from, to } = req.query;
  const entries = listFeedback({ language_code, review_status, from, to });
  res.json(entries);
});

router.get('/:id', (req, res) => {
  const entry = getFeedbackById(req.params.id);
  if (!entry) return res.status(404).json({ error: 'Feedback not found' });
  res.json(entry);
});

router.get('/:id/audio', (req, res) => {
  const entry = getFeedbackById(req.params.id);
  if (!entry) return res.status(404).json({ error: 'Feedback not found' });

  const filePath = path.join(UPLOAD_DIR_PATH, entry.audio_filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Audio file not found' });
  }

  res.setHeader('Content-Type', entry.audio_mime_type || 'application/octet-stream');
  fs.createReadStream(filePath).pipe(res);
});

router.post('/', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Audio file is required (field name: "audio")' });
  }

  const { submitter_name, site_name, language_code } = req.body;

  let entry = insertFeedback({
    submitter_name: submitter_name || null,
    site_name: site_name || null,
    language_code: language_code || 'unknown',
    audio_filename: req.file.filename,
    audio_mime_type: req.file.mimetype,
    transcript: null,
    transcription_status: 'pending',
    transcription_error: null,
  });

  try {
    const filePath = path.join(UPLOAD_DIR_PATH, req.file.filename);
    const { transcript, languageCode } = await transcribeAudio(filePath, req.file.mimetype, language_code);

    db.prepare(`
      UPDATE feedback
      SET transcript = @transcript,
          transcription_status = 'complete',
          language_code = @language_code,
          updated_at = datetime('now')
      WHERE id = @id
    `).run({ transcript, language_code: languageCode || entry.language_code, id: entry.id });
    entry = getFeedbackById(entry.id);
  } catch (err) {
    db.prepare(`
      UPDATE feedback
      SET transcription_status = 'failed', transcription_error = @error, updated_at = datetime('now')
      WHERE id = @id
    `).run({ error: err.message, id: entry.id });
    entry = getFeedbackById(entry.id);
  }

  res.status(201).json(entry);
});

router.patch('/:id', (req, res) => {
  const { review_status, admin_notes } = req.body;
  const entry = updateFeedback(req.params.id, { review_status, admin_notes });
  if (!entry) return res.status(404).json({ error: 'Feedback not found' });
  res.json(entry);
});
