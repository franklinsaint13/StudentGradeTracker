// stats.js
// Pure functions that turn raw database rows into what the UI shows.
// Kept separate from server.js so the math can be tested without a database.

// Grades and averages use two decimal places (hundredths).
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

export function mean(numbers) {
  if (!numbers.length) return null;
  return round2(numbers.reduce((sum, n) => sum + n, 0) / numbers.length);
}

/**
 * @param visibleStudents students to show (may be filtered by search)
 * @param subjects        the four fixed subjects
 * @param grades          ALL of the user's grade rows
 *
 * Each student gets their own average, worked out from the grades entered for
 * them. There are no subject or class averages.
 */
export function buildOverview(visibleStudents, subjects, grades) {
  // student_id -> { subject_id: grade }
  const byStudent = new Map();

  for (const row of grades) {
    if (!byStudent.has(row.student_id)) byStudent.set(row.student_id, {});
    byStudent.get(row.student_id)[row.subject_id] = Number(row.grade);
  }

  return {
    students: visibleStudents.map((s) => {
      const studentGrades = byStudent.get(s.id) || {};
      return {
        id: s.id,
        name: s.name,
        grades: studentGrades,
        average: mean(Object.values(studentGrades)),
      };
    }),
    subjects: subjects.map((j) => ({ id: j.id, name: j.name })),
  };
}

// Turns a typed grade into a number from 0 to 100 with at most 2 decimals.
// Returns null for empty or invalid input (letters, "1e2", negatives, over 100, ...).
export function parseGrade(value) {
  if (value === "" || value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!/^(\d{1,3}(\.\d*)?|\.\d+)$/.test(text)) return null;
  const grade = Number(text);
  if (grade > 100) return null;
  return round2(grade);
}
