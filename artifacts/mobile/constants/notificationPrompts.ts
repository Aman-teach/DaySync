export const PROMPTS = {
  kickoff: [
    "Good morning! Ready to crush it today?",
    "Rise and grind! Let's get today's cadence started.",
    "Morning! What's the main focus for today?",
    "Hey! Time to wake up and start tracking.",
  ],
  checkin: [
    "What's up? Time for a quick check-in.",
    "Hey bro, what are you working on right now?",
    "Just checking in. Drop a quick log!",
    "Ding! What's the current vibe?",
    "How's the focus? Take 10 seconds to log it.",
  ],
  missed_l1: [
    "Did you forget about me? Atlas is waiting for your log.",
    "Hey man, you missed your check-in. Everything good?",
    "I'm literally just sitting here waiting for you to log something.",
    "Bro, it's been a while. Don't break the streak now.",
  ],
  missed_l2: [
    "These reminders don't seem to be working. I guess your focus score will just drop to zero.",
    "Wow. Being ignored hurts, you know. I'll stop asking.",
    "You made Atlas sad. Just one log could fix this.",
    "Fine, keep ignoring me. See if I care about your productivity anymore.",
    "I'm not mad, I'm just disappointed.",
  ],
  wrapup: [
    "Day's almost over! Generate your AI Day Wrap and see how you did.",
    "Time to power down. Let's wrap up today's logs.",
    "Great work today. Check out your AI summary before you sleep!",
  ]
};

export function getRandomPrompt(category: keyof typeof PROMPTS): string {
  const options = PROMPTS[category];
  return options[Math.floor(Math.random() * options.length)];
}
