/**
 * Normalize participant number: trims input, validates numeric-only, parses base 10.
 * Returns a positive integer (> 0) or null if invalid / zero / negative / non-integer.
 *
 * @param {string|number} input
 * @returns {number|null}
 */
export function normalizeParticipantNumber(input) {
  const s = String(input ?? '').trim();
  if (!/^[0-9]+$/.test(s)) return null;
  const n = Number.parseInt(s, 10);
  return n > 0 ? n : null;
}
