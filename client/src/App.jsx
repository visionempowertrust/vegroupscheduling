import { useState } from 'react';
import RecordFeedback from './components/RecordFeedback.jsx';
import FeedbackList from './components/FeedbackList.jsx';

export default function App() {
  const [tab, setTab] = useState('record');

  return (
    <div className="app">
      <h1>Field Feedback</h1>
      <div className="tabs">
        <button className={tab === 'record' ? 'active' : ''} onClick={() => setTab('record')}>
          Record feedback
        </button>
        <button className={tab === 'review' ? 'active' : ''} onClick={() => setTab('review')}>
          Review submissions
        </button>
      </div>

      {tab === 'record' ? <RecordFeedback /> : <FeedbackList />}
    </div>
  );
}
