// Checks what someone has typed into a grade box.
// Returns a message describing the problem, or null if the text is fine so far
// (an empty box is fine: it means "no grade").
export function gradeProblem(next) {
  if (next === "") return null;
  if (/[a-zA-Z]/.test(next)) return "You can't put letters here. Enter a number from 0 to 100.";
  if (/[^0-9.]/.test(next)) return "Only numbers are allowed here. Enter a number from 0 to 100.";
  if ((next.match(/\./g) || []).length > 1) return "That isn't a valid number. Use one decimal point, like 87.25.";
  if (/\.\d{3,}/.test(next)) return "Use up to 2 decimal places, like 87.25.";
  if (Number(next) > 100) return "A grade can't be more than 100.";
  return null;
}
