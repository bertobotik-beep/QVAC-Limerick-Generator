// QVAC Limerick Generator — core logic.
// completion() writes one original 5-line limerick about a topic. The
// one-shot example is real multi-turn history (not prose in the system
// prompt) so the small model is much less likely to parrot it verbatim
// regardless of the real input.

import { completion } from "@qvac/sdk";

function looksUnusable(text) {
  if (!text || text.trim().length === 0) return true;
  if (text.length > 500) return true;
  const bad = ["i cannot", "i can't", "as an ai", "i'm not able", "i do not have", "i don't have"];
  const lower = text.toLowerCase();
  return bad.some((phrase) => lower.includes(phrase));
}

const EXAMPLE_INPUT = "a clumsy cat";
const EXAMPLE_OUTPUT = `There once was a cat quite clumsy,
Whose steps were forever quite crumbsy,
It tripped on its tail,
And slid down the rail,
Then landed all fuzzy and grumbsy.`;
const EXAMPLE_LOWER = EXAMPLE_OUTPUT.toLowerCase();

function fallback(topic) {
  return `There once was a thing called ${topic},\nWhose story was hard to top it.\nIt danced through the day,\nIn its own special way,\nAnd never once seemed to stop it.`;
}

export async function generate(modelId, topic) {
  const run = completion({
    modelId,
    history: [
      {
        role: "system",
        content:
          "You write original, family-friendly limericks (exactly 5 lines, following " +
          "the traditional AABBA rhyme and rhythm pattern) about a given topic. Reply " +
          "with ONLY the 5 lines of the limerick, no title, no explanation, no quotes.",
      },
      { role: "user", content: `Topic: ${EXAMPLE_INPUT}` },
      { role: "assistant", content: EXAMPLE_OUTPUT },
      { role: "user", content: `Topic: ${topic}` },
    ],
    stream: true,
    completionOpts: { temperature: 0.85, maxTokens: 180 },
  });

  let text = "";
  for await (const token of run.tokenStream) text += token;

  text = text
    .trim()
    .replace(/^here'?s[^:\n]*:\s*/i, "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .trim();

  // Guard against the model parroting the one-shot example verbatim.
  const topicLower = topic.toLowerCase();
  if (
    text.toLowerCase().includes("clumsy") &&
    !topicLower.includes("cat") &&
    !topicLower.includes("clumsy")
  ) {
    text = "";
  }

  const limerick = looksUnusable(text) ? fallback(topic) : text;
  return { limerick };
}
