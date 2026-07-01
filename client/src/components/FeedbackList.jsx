import { useEffect, useState } from 'react';
import { fetchFeedbackList, fetchLanguages, updateFeedbackEntry, audioUrl } from '../api/client.js';

export default function FeedbackList() {
  const [entries, setEntries] = useState([]);
  const [languages, setLanguages] = useState({});
  const [languageFilter, setLanguageFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFeedbackList({
        language_code: languageFilter,
        review_status: statusFilter,
      });
      setEntries(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLanguages().then(setLanguages).catch(() => {});
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [languageFilter, statusFilter]);

  async function markReviewed(id) {
    await updateFeedbackEntry(id, { review_status: 'reviewed' });
    load();
  }

  return (
    <div>
      <div className="filters">
        <select value={languageFilter} onChange={(e) => setLanguageFilter(e.target.value)}>
          <option value="">All languages</option>
          {Object.entries(languages).map(([code, label]) => (
            <option key={code} value={code}>{label}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="new">New</option>
          <option value="reviewed">Reviewed</option>
        </select>
      </div>

      {loading && <p>Loading…</p>}
      {error && <p className="status-msg error">{error}</p>}
      {!loading && entries.length === 0 && <p>No feedback submitted yet.</p>}

      {entries.map((entry) => (
        <div className="card feedback-entry" key={entry.id}>
          <div className="meta">
            {entry.submitter_name || 'Anonymous'}
            {entry.site_name ? ` · ${entry.site_name}` : ''}
            {' · '}
            {new Date(entry.created_at).toLocaleString()}
            {' · '}
            <span className={`badge ${entry.review_status}`}>{entry.review_status}</span>{' '}
            <span className={`badge ${entry.transcription_status}`}>{entry.transcription_status}</span>
          </div>

          <audio controls src={audioUrl(entry.id)} />

          {entry.transcription_status === 'complete' && (
            <p className="transcript">{entry.transcript || '(no speech detected)'}</p>
          )}
          {entry.transcription_status === 'failed' && (
            <p className="status-msg error">Transcription failed: {entry.transcription_error}</p>
          )}
          {entry.transcription_status === 'pending' && (
            <p className="status-msg">Transcription pending…</p>
          )}

          <div className="entry-actions">
            {entry.review_status !== 'reviewed' && (
              <button onClick={() => markReviewed(entry.id)}>Mark reviewed</button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
