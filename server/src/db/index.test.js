import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let db, insertFeedback, listFeedback, updateFeedback;
let dbPath;

beforeAll(async () => {
  dbPath = path.join(os.tmpdir(), `feedback-test-${Date.now()}.db`);
  process.env.DB_PATH = dbPath;
  ({ db, insertFeedback, listFeedback, updateFeedback } = await import('./index.js'));
});

afterAll(() => {
  db.close();
  for (const suffix of ['', '-wal', '-shm']) {
    try {
      fs.unlinkSync(`${dbPath}${suffix}`);
    } catch {
      // file may not exist, ignore
    }
  }
});

describe('feedback db', () => {
  it('inserts and lists feedback entries', () => {
    const entry = insertFeedback({
      submitter_name: 'Asha',
      site_name: 'Nashik',
      language_code: 'mr-IN',
      audio_filename: 'a.webm',
      audio_mime_type: 'audio/webm',
      transcript: null,
      transcription_status: 'pending',
      transcription_error: null,
    });

    expect(entry.id).toBeDefined();
    expect(entry.review_status).toBe('new');

    const all = listFeedback();
    expect(all.length).toBe(1);
    expect(all[0].submitter_name).toBe('Asha');
  });

  it('filters by language_code and review_status', () => {
    insertFeedback({
      submitter_name: 'Ravi',
      site_name: 'Pune',
      language_code: 'hi-IN',
      audio_filename: 'b.webm',
      audio_mime_type: 'audio/webm',
      transcript: 'hello',
      transcription_status: 'complete',
      transcription_error: null,
    });

    const marathiOnly = listFeedback({ language_code: 'mr-IN' });
    expect(marathiOnly.every((e) => e.language_code === 'mr-IN')).toBe(true);

    const reviewedOnly = listFeedback({ review_status: 'reviewed' });
    expect(reviewedOnly.length).toBe(0);
  });

  it('updates review status and admin notes', () => {
    const [entry] = listFeedback();
    const updated = updateFeedback(entry.id, { review_status: 'reviewed', admin_notes: 'looks good' });
    expect(updated.review_status).toBe('reviewed');
    expect(updated.admin_notes).toBe('looks good');
  });
});
