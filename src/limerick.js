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

function lastWord(line) {
  const cleaned = line.trim().replace(/[.,!?;:"']+$/g, "");
  const words = cleaned.split(/\s+/);
  return words[words.length - 1] || "";
}

// Approximate rhyme check (same approach as the Lyric Rhyme Helper app):
// compares the tail sound of two words after stripping a silent-e.
function rhymeKey(word) {
  let w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length === 0) return "";
  w = w.replace(/e$/, "");
  const tailLen = Math.min(3, w.length);
  let tail = w.slice(-tailLen);
  tail = tail.replace(/[aeiouy]+/g, "V");
  return tail;
}

function rhymes(a, b) {
  const ka = rhymeKey(a);
  const kb = rhymeKey(b);
  if (!ka || !kb) return false;
  return ka === kb || ka.endsWith(kb) || kb.endsWith(ka);
}

// The model isn't reliably obeying the AABBA instruction on its own, so the
// actual rhyme pattern is verified deterministically: lines 1,2,5 must
// rhyme with each other, and lines 3,4 must rhyme with each other.
function hasValidAABBA(text) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length !== 5) return false;
  const [w1, w2, w3, w4, w5] = lines.map(lastWord);
  return rhymes(w1, w2) && rhymes(w1, w5) && rhymes(w3, w4);
}

// The topic is mentioned mid-line rather than as a line-ending word, since
// forcing it into the rhyme position (the old template did this) only
// rhymes by coincidence for certain topics and produces broken AABBA
// otherwise — these fixed rhyme words work regardless of what the topic is.
function fallback(topic) {
  return `There's a tale to be told, understand,\nAbout ${topic}, so simply grand,\nIt went for a walk,\nHad a curious talk,\nAnd charmed everyone in the land.`;
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

  const limerick =
    looksUnusable(text) || !hasValidAABBA(text) ? fallback(topic) : text;
  return { limerick };
}
