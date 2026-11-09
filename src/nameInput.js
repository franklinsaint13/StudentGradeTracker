// Live checks for the name boxes. The server checks everything again.
// Keep the rules in step with server/names.js.

export const SUFFIXES = ["Jr.", "Sr.", "II", "III", "IV", "V"];

const squash = (text) => String(text ?? "").replace(/\s+/g, " ").trim();
const capitalizeWords = (text) =>
  text.replace(/(^|[\s'’-])(\p{L})/gu, (_, before, letter) => before + letter.toUpperCase());

// Checks first/last name text as it is typed. Returns a message, or null if fine so far.
export function namePartProblem(text, label) {
  if (/\d/.test(text)) return `You can't put numbers in ${label}. Letters only.`;
  if (/[^\p{L}\p{M} .'’-]/u.test(text))
    return `Special characters aren't allowed in ${label}. Use letters, spaces, hyphens (-), apostrophes (') and periods (.) only.`;
  if (text.length > 50) return `${label} is too long (50 characters at most).`;
  return null;
}

// The middle initial box takes one letter (a trailing period is allowed).
export function middleInitialProblem(text) {
  if (/\d/.test(text)) return "You can't put numbers in Middle initial. One letter only.";
  if (/[^\p{L}.]/u.test(text))
    return "Special characters aren't allowed in Middle initial. One letter only, like D.";
  if (!/^\p{L}?\.?$/u.test(text)) return "Middle initial is one letter only, like D.";
  return null;
}

// What the name will look like once saved, or "" until the required parts are filled in.
export function previewName({ last_name, first_name, middle_initial, suffix }) {
  const last = squash(last_name);
  const first = squash(first_name);
  const middle = String(middle_initial ?? "").replace(/\./g, "").trim();
  if (!last || !first || !middle) return "";
  return `${capitalizeWords(last)}, ${capitalizeWords(first)} ${middle.toUpperCase()}.${suffix ? ` ${suffix}` : ""}`;
}
