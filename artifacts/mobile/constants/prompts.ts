export const REMINDER_PROMPTS = [
  "What are you building right now?",
  "Capture the last hour before it fades.",
  "Where did your attention live?",
  "What pulled you in just now?",
  "A quick snapshot — what just happened?",
  "Your future self will want to know this.",
  "What were you thinking about?",
  "Before the moment passes — what was it?",
  "Mark this moment in your timeline.",
  "What has your focus been on?",
  "Something worth remembering just happened.",
  "What did you just finish or start?",
  "Thirty minutes, captured in a sentence.",
  "Your mind was somewhere — where?",
  "What would you tell someone about the last hour?",
  "Where did the time go?",
  "A moment of honesty: what were you doing?",
  "Log it before the next thing starts.",
  "What's the story of this time block?",
  "Quick check-in. What's happening?",
];

export const getRandomPrompt = (): string =>
  REMINDER_PROMPTS[Math.floor(Math.random() * REMINDER_PROMPTS.length)];
