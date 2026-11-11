// stats.js
// Pure functions that turn raw database rows into what the UI shows.
// Kept separate from server.js so the math can be tested without a database.

// Grades and averages use two decimal places (hundredths).
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

// The school's grading system: a percentage average -> grade point and description.
// Listed from the best grade to the worst. `min` is the lowest average that earns the row
// (rounded to 2 decimals); `max` is only used to display the range.
export const GRADING_SCALE = [
  { min: 97.5, max: 100, point: "1.00", label: "Excellent" },
  { min: 94.5, max: 97.49, point: "1.25", label: "Very Good" },
  { min: 91.5, max: 94.49, point: "1.50", label: "Very Good" },
  { min: 86.5, max: 91.49, point: "1.75", label: "Very Good" },
  { min: 81.5, max: 86.49, point: "2.00", label: "Satisfactory" },
  { min: 76, max: 81.49, point: "2.25", label: "Satisfactory" },
  { min: 70.5, max: 75.99, point: "2.50", label: "Satisfactory" },
  { min: 65, max: 70.49, point: "2.75", label: "Fair" },
  { min: 59.5, max: 64.99, point: "3.00", label: "Fair" },
  { min: 0, max: 59.49, point: "5.00", label: "Failed" },
];

// Where an average falls in the grading system, e.g. { point: "1.25", label: "Very Good" }.
// Returns null when the student has no grades yet.
export function gradeEquivalent(average) {
  if (average === null || average === undefined) return null;
  const row = GRADING_SCALE.find((r) => average >= r.min);
  return row ? { point: row.point, label: row.label } : null;
}

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
      const average = mean(Object.values(studentGrades));
      return {
        id: s.id,
        name: s.name,
        grades: studentGrades,
        average,
        equivalent: gradeEquivalent(average),
      };
    }),
    subjects: subjects.map((j) => ({ id: j.id, name: j.name })),
    scale: GRADING_SCALE,
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
