import { useState } from 'react';
import { testSarvamConnection } from '../api/client.js';

export default function TestConnection() {
  const [status, setStatus] = useState(null); // 'testing' | 'ok' | 'error'
  const [message, setMessage] = useState('');

  async function runTest() {
    setStatus('testing');
    setMessage('');
    try {
      const result = await testSarvamConnection();
      setStatus(result.ok ? 'ok' : 'error');
      setMessage(result.message);
    } catch (err) {
      setStatus('error');
      setMessage(err.message);
    }
  }

  return (
    <div className="card">
      <p>
        Sends a short silent test clip to the Sarvam AI speech-to-text API using the
        server's configured <code>SARVAM_API_KEY</code>, to confirm the key and network
        access are working before field workers start submitting real feedback.
      </p>

      <button className="submit-btn" onClick={runTest} disabled={status === 'testing'}>
        {status === 'testing' ? 'Testing…' : 'Test Sarvam connection'}
      </button>

      {status === 'ok' && <p className="status-msg success">✅ {message}</p>}
      {status === 'error' && <p className="status-msg error">❌ {message}</p>}
    </div>
  );
}
