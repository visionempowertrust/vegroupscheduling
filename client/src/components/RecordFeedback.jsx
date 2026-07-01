import { useEffect, useRef, useState } from 'react';
import { fetchLanguages, submitFeedback } from '../api/client.js';

export default function RecordFeedback() {
  const [languages, setLanguages] = useState({ unknown: 'Auto-detect' });
  const [languageCode, setLanguageCode] = useState('unknown');
  const [submitterName, setSubmitterName] = useState('');
  const [siteName, setSiteName] = useState('');
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);

  useEffect(() => {
    fetchLanguages().then(setLanguages).catch(() => {});
  }, []);

  async function startRecording() {
    setError(null);
    setResult(null);
    setAudioBlob(null);
    setAudioUrl(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        streamRef.current?.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch (err) {
      setError('Microphone access denied or unavailable: ' + err.message);
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  async function handleSubmit() {
    if (!audioBlob) return;
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const entry = await submitFeedback({ audioBlob, submitterName, siteName, languageCode });
      setResult(entry);
      setAudioBlob(null);
      setAudioUrl(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card">
      <label htmlFor="submitter">Your name (optional)</label>
      <input
        id="submitter"
        type="text"
        value={submitterName}
        onChange={(e) => setSubmitterName(e.target.value)}
        placeholder="e.g. Ravi Kumar"
      />

      <label htmlFor="site">Site / location (optional)</label>
      <input
        id="site"
        type="text"
        value={siteName}
        onChange={(e) => setSiteName(e.target.value)}
        placeholder="e.g. Village school, Nashik"
      />

      <label htmlFor="language">Language you'll speak in</label>
      <select id="language" value={languageCode} onChange={(e) => setLanguageCode(e.target.value)}>
        {Object.entries(languages).map(([code, label]) => (
          <option key={code} value={code}>{label}</option>
        ))}
      </select>

      {!recording && (
        <button className="record-btn" onClick={startRecording} disabled={submitting}>
          🎙️ Start recording
        </button>
      )}
      {recording && (
        <button className="record-btn recording" onClick={stopRecording}>
          ⏹ Stop recording
        </button>
      )}

      {audioUrl && (
        <>
          <audio controls src={audioUrl} />
          <button className="submit-btn" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Submitting & transcribing…' : 'Submit feedback'}
          </button>
        </>
      )}

      {error && <p className="status-msg error">{error}</p>}
      {result && (
        <div className="status-msg success">
          <p>Feedback submitted successfully.</p>
          {result.transcription_status === 'complete' && (
            <p><strong>Transcript:</strong> {result.transcript || '(empty)'}</p>
          )}
          {result.transcription_status === 'failed' && (
            <p>Audio saved, but transcription failed: {result.transcription_error}</p>
          )}
        </div>
      )}
    </div>
  );
}
