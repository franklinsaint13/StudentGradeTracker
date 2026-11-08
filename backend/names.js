// names.js
// Validates and formats a student's name. A name is entered as separate parts:
//   last name, first name, middle initial, and an optional suffix.
// The saved display name looks like:  Baylon, Daniel Vincent D. Jr.

export const SUFFIXES = ["Jr.", "Sr.", "II", "III", "IV", "V"];
const MAX_LENGTH = 50;

// Letters (any language, including ñ and accents), spaces, hyphens, apostrophes
// and periods. No digits and no other symbols.
const NAME_OK = /^\p{L}[\p{L}\p{M} .'’-]*$/u;

const squash = (text) => String(text ?? "").replace(/\s+/g, " ").trim();

// Capitalize the first letter of each word. The rest is left as typed, so
// "McDonald" stays "McDonald" and "o'brien" becomes "O'Brien".
const capitalizeWords = (text) =>
  text.replace(/(^|[\s'’-])(\p{L})/gu, (_, before, letter) => before + letter.toUpperCase());

// Why a first/last name is not acceptable, or null if it is fine.
export function namePartProblem(text, label) {
  if (/\d/.test(text)) return `You can't put numbers in ${label}. Letters only.`;
  if (/[^\p{L}\p{M} .'’-]/u.test(text))
    return `Special characters aren't allowed in ${label}. Use letters, spaces, hyphens (-), apostrophes (') and periods (.) only.`;
  if (text.length > MAX_LENGTH) return `${label} is too long (${MAX_LENGTH} characters at most).`;
  return null;
}

export function formatStudentName({ last_name, first_name, middle_initial, suffix }) {
  return `${last_name}, ${first_name} ${middle_initial}.${suffix ? ` ${suffix}` : ""}`;
}

/**
 * Checks the four name parts. Returns { error } if something is wrong, otherwise
 * the cleaned parts plus the display `name`:
 *   { last_name, first_name, middle_initial, suffix, name }
 */
export function validateStudentName(input = {}) {
  const last = squash(input.last_name);
  const first = squash(input.first_name);
  const middleRaw = String(input.middle_initial ?? "").trim();
  const suffix = String(input.suffix ?? "").trim();

  if (!last) return { error: "Last name is required." };
  if (!first) return { error: "First name is required." };
  for (const [text, label] of [[last, "Last name"], [first, "First name"]]) {
    const problem = namePartProblem(text, label);
    if (problem) return { error: problem };
    if (!NAME_OK.test(text)) return { error: `${label} must start with a letter.` };
  }

  if (!middleRaw) return { error: "Middle initial is required." };
  if (/\d/.test(middleRaw)) return { error: "You can't put numbers in Middle initial. One letter only." };
  if (/[^\p{L}.]/u.test(middleRaw))
    return { error: "Special characters aren't allowed in Middle initial. One letter only, like D." };
  const middle = middleRaw.replace(/\.$/, ""); // "D." is fine, we add the period ourselves
  if (!/^\p{L}$/u.test(middle)) return { error: "Middle initial must be a single letter, like D." };

  if (suffix && !SUFFIXES.includes(suffix))
    return { error: `Suffix must be one of: ${SUFFIXES.join(", ")}.` };

  const parts = {
    last_name: capitalizeWords(last),
    first_name: capitalizeWords(first),
    middle_initial: middle.toUpperCase(),
    suffix: suffix || null,
  };
  return { ...parts, name: formatStudentName(parts) };
}
