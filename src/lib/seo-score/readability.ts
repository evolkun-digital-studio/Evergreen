// English readability metrics. Heuristic by nature (no dictionary), but stable and fast enough
// to run on every keystroke.

export function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+(?=[A-Z0-9“"‘'(])|\n+/)
    .map((s) => s.trim())
    .filter((s) => /[A-Za-z]/.test(s));
}

const wordsOf = (s: string) => s.match(/[A-Za-z]+(?:['’][A-Za-z]+)*|\d+(?:[.,]\d+)*/g) ?? [];

/** Vowel-group syllable estimate with the usual English adjustments. */
export function syllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  if (w.length <= 3) return 1;
  // Silent endings (-e, -es, -ed after a consonant) don't add a syllable; keep the consonant.
  const trimmed = w.replace(/([^laeiouy])(?:es|ed|e)$/, "$1").replace(/^y/, "");
  const groups = trimmed.match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups ? groups.length : 1);
}

/** Flesch reading ease (0–100+, higher is easier; 60–70 ≈ plain English). */
export function fleschReadingEase(text: string): number {
  const sentences = splitSentences(text);
  const words = sentences.flatMap(wordsOf);
  if (!sentences.length || !words.length) return 0;
  const syl = words.reduce((n, w) => n + (/^\d/.test(w) ? 1 : syllables(w)), 0);
  return Math.round((206.835 - 1.015 * (words.length / sentences.length) - 84.6 * (syl / words.length)) * 10) / 10;
}

export function averageSentenceLength(text: string): number {
  const sentences = splitSentences(text);
  if (!sentences.length) return 0;
  return Math.round((sentences.flatMap(wordsOf).length / sentences.length) * 10) / 10;
}

const PASSIVE = /\b(?:am|is|are|was|were|be|been|being|get|gets|got)\s+(?:\w+ly\s+)?(?:\w+ed|been|done|made|known|given|taken|seen|shown|built|written|paid|held|kept|sent|set|found|told|brought|bought|thought|meant|left|run|put|led)\b/i;

/** Share of sentences that look passive (0–1). */
export function passiveRatio(text: string): number {
  const sentences = splitSentences(text);
  if (!sentences.length) return 0;
  return sentences.filter((s) => PASSIVE.test(s)).length / sentences.length;
}

const TRANSITIONS = [
  "also", "additionally", "furthermore", "moreover", "however", "therefore", "thus", "hence", "consequently",
  "for example", "for instance", "in addition", "in contrast", "on the other hand", "meanwhile", "finally",
  "first", "second", "third", "next", "then", "similarly", "likewise", "instead", "because", "as a result",
  "in short", "overall", "in summary", "to summarise", "to summarize", "although", "while", "unlike",
  "specifically", "in fact", "indeed", "otherwise", "after", "before", "once", "since", "so",
];
const TRANSITION_RX = new RegExp(`(?:^|[\\s,;(])(?:${TRANSITIONS.map((t) => t.replace(/ /g, "\\s+")).join("|")})\\b`, "i");

/** Share of sentences containing a transition word (0–1). */
export function transitionRatio(text: string): number {
  const sentences = splitSentences(text);
  if (!sentences.length) return 0;
  return sentences.filter((s) => TRANSITION_RX.test(s)).length / sentences.length;
}
