import { Router } from "express";
import OpenAI from "openai";

const router = Router();

router.post("/", async (req, res) => {
  const { entries, dateKey } = req.body as {
    entries: Array<{
      id: string;
      text: string;
      tags: string[];
      focus: "deep" | "light" | "off";
      energy: "high" | "low";
      createdAt: string;
      intervalMinutes: number;
    }>;
    dateKey: string;
  };

  if (!entries || entries.length === 0) {
    res.status(400).json({ error: "No entries provided" });
    return;
  }

  if (!process.env["OPENAI_API_KEY"]) {
    res.status(503).json({ error: "AI service not configured" });
    return;
  }

  const openai = new OpenAI({ apiKey: process.env["OPENAI_API_KEY"] });

  const entryLines = entries.map((e) => {
    const time = new Date(e.createdAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${time} [${e.focus}/${e.energy}] [${e.tags.join(", ")}]: ${e.text || "(no note)"}`;
  });

  const tagTotals: Record<string, number> = {};
  for (const e of entries) {
    for (const tag of e.tags) {
      tagTotals[tag] = (tagTotals[tag] ?? 0) + e.intervalMinutes;
    }
  }

  const systemPrompt =
    "You are a concise personal productivity analyst. The user tracks how they spend their time using periodic check-ins. Analyze their log and return a terse, honest JSON summary. No motivational fluff. No invented activities. Cite only what is in the log.";

  const userPrompt = `Daily log for ${dateKey}:\n\n${entryLines.join("\n")}\n\nTag totals (minutes): ${JSON.stringify(tagTotals)}\n\nReturn a JSON object with exactly these fields:\n{\n  "summary": "1-2 sentences honest summary of the day",\n  "highlights": ["3-5 concrete specifics from the log"],\n  "tagBreakdown": {"tag_id": minutes_number},\n  "focusStreaks": [lengths_of_consecutive_deep_blocks_as_numbers],\n  "mood": "1 brief sentence on energy/mood signal",\n  "anomalies": ["notable patterns or gaps, if any"]\n}\n\nOnly include tags from the log. tagBreakdown values must be numbers. Be terse.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1024,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const data = JSON.parse(raw);
    res.json(data);
  } catch (err: unknown) {
    req.log?.error({ err }, "Day wrap generation failed");
    res.status(500).json({ error: "Failed to generate summary" });
  }
});

export default router;
