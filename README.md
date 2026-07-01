# Field Feedback

An audio feedback intake app for field staff. Field workers record a short voice
note (observations, complaints, feedback) in their own language directly from
the browser; the backend transcribes it using the
[Sarvam AI](https://docs.sarvam.ai/api-reference-docs/speech-to-text/transcribe)
speech-to-text API (Hindi, Bengali, Kannada, Malayalam, Marathi, Odia, Punjabi,
Tamil, Telugu, Gujarati, English-India, or auto-detect). A review dashboard
lets office staff play back recordings, read transcripts, and mark items as
reviewed.

## Project layout

```
server/   Express + SQLite API, Sarvam STT integration
client/   React (Vite) UI: record tab + review dashboard
```

## Prerequisites

- Node.js 18+ (uses built-in `fetch`, `FormData`, `Blob`)
- A Sarvam AI API subscription key: https://dashboard.sarvam.ai

## Setup

### Backend

```bash
cd server
cp .env.example .env
# edit .env and set SARVAM_API_KEY
npm install
npm run dev
```

The API runs on `http://localhost:4000` by default. SQLite data lives at
`server/data/feedback.db` and uploaded recordings in `server/uploads/`
(both git-ignored).

### Frontend

```bash
cd client
npm install
npm run dev
```

Open `http://localhost:5173`. Vite proxies `/api` requests to the backend.

## How it works

1. **Record tab** — the field worker picks a language, records audio via the
   browser's `MediaRecorder` API, and submits it.
2. The server saves the audio file, calls the Sarvam AI speech-to-text REST
   API (`POST /speech-to-text`, multipart form with `file`, `model`, and
   optional `language_code`, authenticated via the `api-subscription-key`
   header), and stores the returned transcript.
3. **Review tab** — office staff can filter by language or review status,
   play back the original recording, read the transcript, and mark entries
   reviewed.
4. **Test Sarvam connection tab** — sends a short silent test clip to Sarvam
   using the server's configured `SARVAM_API_KEY`, so you can confirm the
   key and network access are working before rolling this out to field
   workers, without needing a microphone or real speech.

If transcription fails (bad network, invalid key, unsupported audio) the
recording is still saved with `transcription_status: "failed"` and the error
message, so no feedback is ever lost — it can be retried or transcribed
manually later.

## API

| Method | Path                      | Description                              |
| ------ | ------------------------- | ----------------------------------------- |
| GET    | `/api/health`             | Health check                              |
| GET    | `/api/feedback/languages` | Supported language codes                  |
| POST   | `/api/feedback/test-connection` | Verify the Sarvam API key/connectivity using a silent test clip |
| GET    | `/api/feedback`           | List feedback (filters: `language_code`, `review_status`, `from`, `to`) |
| POST   | `/api/feedback`           | Submit a recording (`multipart/form-data`: `audio`, `submitter_name`, `site_name`, `language_code`) |
| GET    | `/api/feedback/:id`       | Get one entry                             |
| GET    | `/api/feedback/:id/audio` | Stream the audio file                     |
| PATCH  | `/api/feedback/:id`       | Update `review_status` / `admin_notes`    |

## Tests

```bash
cd server
npm test
```

Covers the Sarvam client (mocked HTTP) and the SQLite data layer.

## Notes / next steps

- Sarvam's REST endpoint handles clips under ~30s synchronously; for longer
  recordings switch to Sarvam's batch API and poll for completion.
- No authentication is included yet — add it before exposing the review
  dashboard beyond a trusted network.
