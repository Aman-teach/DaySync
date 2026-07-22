import { Router } from "express";
import express from "express";

const router = Router();

router.post(
  "/",
  express.json({ limit: "20mb" }),
  async (req, res) => {
    const { audio, mimeType } = req.body as {
      audio?: string;
      mimeType?: string;
    };

    if (!audio) {
      res.status(400).json({ error: "No audio provided" });
      return;
    }

    const apiKey = process.env["DEEPGRAM_API_KEY"];
    if (!apiKey) {
      res.status(503).json({ error: "Transcription service not configured" });
      return;
    }

    const buffer = Buffer.from(audio, "base64");
    const contentType = mimeType ?? "audio/m4a";

    try {
      const dgRes = await fetch(
        "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&punctuate=true",
        {
          method: "POST",
          headers: {
            Authorization: `Token ${apiKey}`,
            "Content-Type": contentType,
          },
          body: buffer,
        }
      );

      if (!dgRes.ok) {
        const errText = await dgRes.text();
        req.log?.error({ status: dgRes.status, body: errText }, "Deepgram error");
        res.status(502).json({ error: "Transcription failed" });
        return;
      }

      const data = (await dgRes.json()) as {
        results?: {
          channels?: Array<{
            alternatives?: Array<{ transcript?: string; confidence?: number }>;
          }>;
        };
      };

      const transcript =
        data.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "";
      const confidence =
        data.results?.channels?.[0]?.alternatives?.[0]?.confidence ?? null;

      res.json({ transcript, confidence });
    } catch (err) {
      req.log?.error({ err }, "Transcription request failed");
      res.status(500).json({ error: "Transcription request failed" });
    }
  }
);

export default router;
