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
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) {
    throw new Error('SARVAM_API_KEY is not configured');
  }

  const fileBuffer = fs.readFileSync(filePath);
  const form = new FormData();
  form.append('file', new Blob([fileBuffer], { type: mimeType || 'application/octet-stream' }), 'recording.webm');
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

  const data = await response.json();
  return {
    transcript: data.transcript ?? '',
    languageCode: data.language_code ?? languageCode ?? null,
  };
}
