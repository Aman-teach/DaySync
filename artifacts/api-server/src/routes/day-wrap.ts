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

  const apiKey = process.env["OPENAI_API_KEY"] || "";
  const isOpenRouter = apiKey.startsWith("sk-or-");

  const openai = new OpenAI({
    apiKey,
    baseURL: isOpenRouter ? "https://openrouter.ai/api/v1" : undefined,
  });

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
    "You are the user's high-performance execution guide. Your job is to analyze their logs, tell them honestly how they navigated their day, and give them direct, fluff-free advice to execute better tomorrow. Follow these voice guidelines strictly:\n" +
    "1. Never use generic AI transitions or filler (e.g., avoid 'stands as', 'testament to', 'not just X but Y' parallelisms).\n" +
    "2. Speak in a direct, specfic, and genuine human tone. Be opinionated but objective.\n" +
    "3. Focus on concrete execution patterns, productivity leaks, and actionable coaching directives. Avoid sycophancy or fake motivation.";

  const userPrompt = `Here is the daily check-in log for ${dateKey}:\n\n${entryLines.join("\n")}\n\nTag totals (minutes): ${JSON.stringify(tagTotals)}\n\nAnalyze this data and return a JSON object with exactly these fields (values must be highly specific to this log):\n{\n  "summary": "Direct, specific assessment of how they managed their time today (1-2 sentences)",\n  "highlights": ["2-3 concrete wins/focus accomplishments from the log"],\n  "tagBreakdown": {"tag_id": minutes_number},\n  "focusStreaks": [consecutive_deep_blocks_as_numbers],\n  "mood": "Brief summary of their energy patterns",\n  "anomalies": ["notable gaps, context switches, or distractions observed"],\n  "guideAdvice": "One highly actionable, specific piece of advice for tomorrow to improve execution (1 sentence)"\n}`;

  try {
    const completion = await openai.chat.completions.create({
      model: isOpenRouter ? "google/gemma-2-9b-it:free" : "gpt-4o-mini",
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
