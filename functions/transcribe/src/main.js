import { Blob } from 'node:buffer';

export default async ({ req, res, log, error }) => {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.json({ error: 'Method not allowed' }, 405);
  }

  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    error('DEEPGRAM_API_KEY not set in function environment variables');
    return res.json({ error: 'Transcription service not configured' }, 503);
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.json({ error: 'Invalid JSON body' }, 400);
  }

  const { audio, mimeType } = body ?? {};

  if (!audio) {
    return res.json({ error: 'No audio provided' }, 400);
  }

  const buffer = Buffer.from(audio, 'base64');
  const contentType = mimeType ?? 'audio/m4a';

  try {
    const dgRes = await fetch(
      'https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&punctuate=true',
      {
        method: 'POST',
        headers: {
          Authorization: `Token ${apiKey}`,
          'Content-Type': contentType,
        },
        body: buffer,
      }
    );

    if (!dgRes.ok) {
      const errText = await dgRes.text();
      error(`Deepgram error ${dgRes.status}: ${errText}`);
      return res.json({ error: 'Transcription failed' }, 502);
    }

    const data = await dgRes.json();
    const transcript =
      data?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? '';
    const confidence =
      data?.results?.channels?.[0]?.alternatives?.[0]?.confidence ?? null;

    log(`Transcribed ${buffer.byteLength} bytes → "${transcript.slice(0, 60)}"`);

    return res.json({ transcript, confidence });
  } catch (err) {
    error(`Fetch to Deepgram failed: ${err}`);
    return res.json({ error: 'Transcription request failed' }, 500);
  }
};
