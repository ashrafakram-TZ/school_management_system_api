export const GRADE_SCALE: { grade: string; min: number }[] = [
  { grade: 'A1', min: 91 },
  { grade: 'A2', min: 81 },
  { grade: 'B1', min: 71 },
  { grade: 'B2', min: 61 },
  { grade: 'C1', min: 51 },
  { grade: 'C2', min: 41 },
  { grade: 'D', min: 33 },
  { grade: 'E', min: 0 },
];

export type ResultStatus = 'pass' | 'fail' | 'incomplete';

export interface SubjectScore {
  subject_id: number;
  max_marks: number;
  pass_marks: number;
  marks: number | null;
  is_absent: boolean;
  entered: boolean;
}

export interface StudentScore {
  total: number;
  max_total: number;
  percent: number | null;
  grade: string | null;
  result: ResultStatus;
}

export interface MarkInput {
  student_id: number;
  marks: number | null;
  is_absent: boolean;
}

export interface MarkError {
  index: number;
  message: string;
}

export function percentOf(total: number, maxTotal: number): number {
  if (maxTotal <= 0) return 0;
  return Math.round((total / maxTotal) * 1000) / 10;
}

export function gradeFor(percent: number): string {
  return (GRADE_SCALE.find((step) => percent >= step.min) ?? GRADE_SCALE[GRADE_SCALE.length - 1]).grade;
}

export function subjectPassed(score: SubjectScore): boolean | null {
  if (!score.entered) return null;
  if (score.is_absent || score.marks === null) return false;
  return score.marks >= score.pass_marks;
}

export function scoreStudent(scores: SubjectScore[]): StudentScore {
  const total = round2(scores.reduce((sum, score) => sum + (score.is_absent ? 0 : (score.marks ?? 0)), 0));
  const maxTotal = scores.reduce((sum, score) => sum + score.max_marks, 0);
  const complete = scores.length > 0 && scores.every((score) => score.entered);
  if (!complete) return { total, max_total: maxTotal, percent: null, grade: null, result: 'incomplete' };
  const percent = percentOf(total, maxTotal);
  const failed = scores.some((score) => subjectPassed(score) === false);
  return { total, max_total: maxTotal, percent, grade: gradeFor(percent), result: failed ? 'fail' : 'pass' };
}

export function competitionRanks(scores: (number | null)[]): (number | null)[] {
  const ranked = scores.filter((score): score is number => score !== null).sort((a, b) => b - a);
  return scores.map((score) => (score === null ? null : ranked.findIndex((value) => value === score) + 1));
}

export function validateMarks(items: MarkInput[], maxMarks: number, names: Map<number, string>): MarkError[] {
  const errors: MarkError[] = [];
  items.forEach((item, index) => {
    if (item.is_absent || item.marks === null) return;
    if (item.marks < 0 || item.marks > maxMarks) {
      const name = names.get(item.student_id) ?? `Student ${item.student_id}`;
      errors.push({ index, message: `Marks for ${name} must be between 0 and ${maxMarks}` });
    }
  });
  return errors;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
