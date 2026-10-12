// Glyph coverage of the Franie trial files. Widen this when the licensed font is installed.
const FRANIE_SUPPORTED = /^[A-Za-z0-9 !,\-.?]$/;

type FranieRun = { text: string; supported: boolean };

/** Splits text into runs Franie can draw and runs that need the sans fallback. */
export function splitFranie(text: string): FranieRun[] {
  const runs: FranieRun[] = [];
  for (const ch of text) {
    // Collapse other whitespace (newlines from JSX) into the supported space.
    const supported = FRANIE_SUPPORTED.test(ch) || /\s/.test(ch);
    const last = runs[runs.length - 1];
    if (last && last.supported === supported) last.text += ch;
    else runs.push({ text: ch, supported });
  }
  return runs;
}
