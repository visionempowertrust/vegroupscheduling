import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { transcribeAudio, testSarvamConnection } from './sarvam.js';

describe('transcribeAudio', () => {
  let tmpFile;

  beforeEach(() => {
    tmpFile = path.join(os.tmpdir(), `test-audio-${Date.now()}.webm`);
    fs.writeFileSync(tmpFile, Buffer.from([1, 2, 3]));
    process.env.SARVAM_API_KEY = 'test-key';
  });

  afterEach(() => {
    fs.unlinkSync(tmpFile);
    vi.unstubAllGlobals();
    delete process.env.SARVAM_API_KEY;
  });

  it('throws when SARVAM_API_KEY is missing', async () => {
    delete process.env.SARVAM_API_KEY;
    await expect(transcribeAudio(tmpFile, 'audio/webm', 'hi-IN')).rejects.toThrow(/SARVAM_API_KEY/);
  });

  it('posts multipart form data and returns the transcript', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ transcript: 'namaste duniya', language_code: 'hi-IN' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await transcribeAudio(tmpFile, 'audio/webm', 'hi-IN');

    expect(result).toEqual({ transcript: 'namaste duniya', languageCode: 'hi-IN' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.sarvam.ai/speech-to-text');
    expect(options.headers['api-subscription-key']).toBe('test-key');
    expect(options.body).toBeInstanceOf(FormData);
  });

  it('throws a descriptive error when the API responds with a failure status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'invalid api key',
    }));

    await expect(transcribeAudio(tmpFile, 'audio/webm', 'hi-IN')).rejects.toThrow(/401/);
  });
});

describe('testSarvamConnection', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.SARVAM_API_KEY;
  });

  it('reports not-ok when SARVAM_API_KEY is missing, without throwing', async () => {
    delete process.env.SARVAM_API_KEY;
    const result = await testSarvamConnection();
    expect(result).toEqual({ ok: false, message: expect.stringMatching(/SARVAM_API_KEY/) });
  });

  it('reports ok when Sarvam accepts the test clip', async () => {
    process.env.SARVAM_API_KEY = 'test-key';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ transcript: '', language_code: 'unknown' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await testSarvamConnection();

    expect(result.ok).toBe(true);
    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers['api-subscription-key']).toBe('test-key');
  });

  it('reports not-ok with the error message when Sarvam rejects the request', async () => {
    process.env.SARVAM_API_KEY = 'bad-key';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      text: async () => 'invalid subscription key',
    }));

    const result = await testSarvamConnection();

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/403/);
  });
});
