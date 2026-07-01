import fs from 'node:fs';

const SARVAM_STT_URL = process.env.SARVAM_STT_URL || 'https://api.sarvam.ai/speech-to-text';
const SARVAM_STT_MODEL = process.env.SARVAM_STT_MODEL || 'saarika:v2.5';

/**
 * Supported Indian language codes for the Sarvam Saarika/Saaras models (BCP-47).
 * 'unknown' lets Sarvam auto-detect the spoken language.
 */
export const SUPPORTED_LANGUAGES = {
  unknown: 'Auto-detect',
  'hi-IN': 'Hindi',
  'bn-IN': 'Bengali',
  'kn-IN': 'Kannada',
  'ml-IN': 'Malayalam',
  'mr-IN': 'Marathi',
  'od-IN': 'Odia',
  'pa-IN': 'Punjabi',
  'ta-IN': 'Tamil',
  'te-IN': 'Telugu',
  'en-IN': 'English (India)',
  'gu-IN': 'Gujarati',
};

async function postToSarvam(fileBuffer, mimeType, filename, languageCode) {
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) {
    throw new Error('SARVAM_API_KEY is not configured');
  }

  const form = new FormData();
  form.append('file', new Blob([fileBuffer], { type: mimeType || 'application/octet-stream' }), filename);
  form.append('model', SARVAM_STT_MODEL);
  if (languageCode && languageCode !== 'unknown') {
    form.append('language_code', languageCode);
  }

  const response = await fetch(SARVAM_STT_URL, {
    method: 'POST',
    headers: {
      'api-subscription-key': apiKey,
    },
    body: form,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Sarvam STT request failed (${response.status}): ${body}`);
  }

  return response.json();
}

/**
 * Transcribes an audio file using the Sarvam AI speech-to-text REST API.
 * See https://docs.sarvam.ai/api-reference-docs/speech-to-text/transcribe
 *
 * @param {string} filePath - path to the audio file on disk
 * @param {string} mimeType - audio mime type (e.g. audio/webm)
 * @param {string} [languageCode] - BCP-47 language code, or 'unknown' to auto-detect
 * @returns {Promise<{ transcript: string, languageCode: string|null }>}
 */
export async function transcribeAudio(filePath, mimeType, languageCode) {
  const fileBuffer = fs.readFileSync(filePath);
  const data = await postToSarvam(fileBuffer, mimeType, 'recording.webm', languageCode);
  return {
    transcript: data.transcript ?? '',
    languageCode: data.language_code ?? languageCode ?? null,
  };
}

/**
 * Builds a ~0.3s silent 16-bit PCM mono WAV buffer, used only to verify that
 * the configured Sarvam API key and endpoint accept requests (connectivity/auth
 * check), without requiring a real microphone recording.
 */
function buildSilentWavBuffer(durationSeconds = 0.3, sampleRate = 16000) {
  const numSamples = Math.floor(durationSeconds * sampleRate);
  const dataSize = numSamples * 2; // 16-bit samples
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0, 'ascii');
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8, 'ascii');
  buffer.write('fmt ', 12, 'ascii');
  buffer.writeUInt32LE(16, 16); // fmt chunk size
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32); // block align
  buffer.writeUInt16LE(16, 34); // bits per sample
  buffer.write('data', 36, 'ascii');
  buffer.writeUInt32LE(dataSize, 40);
  // remaining bytes are already zero-filled (silence)

  return buffer;
}

/**
 * Verifies that the Sarvam API key/endpoint are reachable and accept
 * requests, by sending a short silent clip. Never throws - returns a
 * result object so it can be surfaced directly in an API response.
 *
 * @returns {Promise<{ ok: boolean, message: string }>}
 */
export async function testSarvamConnection() {
  if (!process.env.SARVAM_API_KEY) {
    return { ok: false, message: 'SARVAM_API_KEY is not configured on the server' };
  }

  try {
    const wav = buildSilentWavBuffer();
    await postToSarvam(wav, 'audio/wav', 'test.wav', 'unknown');
    return { ok: true, message: 'Successfully connected to Sarvam AI speech-to-text API.' };
  } catch (err) {
    return { ok: false, message: err.message };
  }
}
