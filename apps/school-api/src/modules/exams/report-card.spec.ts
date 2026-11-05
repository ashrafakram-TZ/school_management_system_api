import {
  attendanceSummary,
  buildReportCard,
  CardExamInput,
  CardSubjectScore,
  cellText,
  gradeScale,
  OTHER_TERM,
  remarkFor,
} from './report-card.logic';

const subject = (id: number, name: string, marks: number | null, extra: Partial<CardSubjectScore> = {}) => ({
  subject_id: id,
  name,
  code: name.slice(0, 4).toUpperCase(),
  max_marks: 100,
  pass_marks: 35,
  marks,
  is_absent: false,
  passed: marks === null ? null : marks >= 35,
  ...extra,
});

const exam = (id: number, overrides: Partial<CardExamInput> = {}): CardExamInput => ({
  id,
  name: `Exam ${id}`,
  start_date: `2026-0${id}-10`,
  end_date: `2026-0${id}-15`,
  term_id: 1,
  term_name: 'Term 1',
  term_order: 1,
  total: 160,
  max_total: 200,
  percent: 80,
  grade: 'B1',
  result: 'pass',
  section_rank: 2,
  section_size: 30,
  class_rank: 4,
  class_size: 60,
  subjects: [subject(1, 'Mathematics', 85), subject(2, 'English', 75)],
  ...overrides,
});

describe('report card', () => {
  it('orders exams by term, then date, with exams without a term last', () => {
    const card = buildReportCard([
      exam(3, { term_id: null, term_name: null, term_order: 0 }),
      exam(2, { term_id: 2, term_name: 'Term 2', term_order: 2 }),
      exam(1),
    ]);
    expect(card.columns.map((column) => column.exam_id)).toEqual([1, 2, 3]);
    expect(card.terms).toEqual([
      { term_id: 1, name: 'Term 1', exam_ids: [1] },
      { term_id: 2, name: 'Term 2', exam_ids: [2] },
      { term_id: null, name: OTHER_TERM, exam_ids: [3] },
    ]);
  });

  it('groups exams of the same term under one heading', () => {
    const card = buildReportCard([exam(1), exam(2)]);
    expect(card.terms).toEqual([{ term_id: 1, name: 'Term 1', exam_ids: [1, 2] }]);
  });

  it('adds up each subject across exams and grades it', () => {
    const card = buildReportCard([
      exam(1, { subjects: [subject(1, 'Mathematics', 90), subject(2, 'English', 70)] }),
      exam(2, { subjects: [subject(1, 'Mathematics', 96)] }),
    ]);
    const maths = card.subjects.find((row) => row.name === 'Mathematics')!;
    expect(maths.total).toBe(186);
    expect(maths.max_total).toBe(200);
    expect(maths.percent).toBe(93);
    expect(maths.grade).toBe('A1');
    const english = card.subjects.find((row) => row.name === 'English')!;
    expect(english.cells[1]).toBeNull();
    expect(english.max_total).toBe(100);
  });

  it('lists languages first, then other subjects, each in name order', () => {
    const card = buildReportCard([
      exam(1, {
        subjects: [
          subject(3, 'Science', 80, { type: 'theory' }),
          subject(2, 'Tamil', 80, { type: 'language' }),
          subject(4, 'Art', 90, { type: 'activity' }),
          subject(1, 'English', 70, { type: 'language' }),
          subject(5, 'Mathematics', 70, { type: 'theory' }),
        ],
      }),
    ]);
    expect(card.subjects.map((row) => row.name)).toEqual(['English', 'Tamil', 'Mathematics', 'Science', 'Art']);
  });

  it('counts an absent paper as zero and leaves papers without marks out of the totals', () => {
    const card = buildReportCard([
      exam(1, {
        subjects: [subject(1, 'Science', null, { is_absent: true, passed: false }), subject(2, 'Social', null)],
      }),
    ]);
    const science = card.subjects.find((row) => row.name === 'Science')!;
    expect(science.total).toBe(0);
    expect(science.max_total).toBe(100);
    const social = card.subjects.find((row) => row.name === 'Social')!;
    expect(social.max_total).toBe(0);
    expect(social.percent).toBeNull();
    expect(cellText(science.cells[0]!)).toBe('AB');
    expect(cellText(social.cells[0]!)).toBe('·');
    expect(cellText(null)).toBe('—');
  });

  it('works out the overall result from complete exams only', () => {
    const card = buildReportCard([
      exam(1, { total: 150, max_total: 200 }),
      exam(2, { total: 170, max_total: 200 }),
      exam(3, { total: 20, max_total: 200, result: 'incomplete', percent: null, grade: null }),
    ]);
    expect(card.overall).toEqual({ total: 320, max_total: 400, percent: 80, grade: 'B1', result: 'pass' });
  });

  it('fails overall only when a subject stays below its pass marks across the exams', () => {
    const weakUnitTest = buildReportCard([
      exam(1, { result: 'fail', subjects: [subject(1, 'Mathematics', 20), subject(2, 'English', 75)] }),
      exam(2, { subjects: [subject(1, 'Mathematics', 90), subject(2, 'English', 75)] }),
    ]);
    expect(weakUnitTest.overall.result).toBe('pass');
    const weakSubject = buildReportCard([
      exam(1, { subjects: [subject(1, 'Mathematics', 20), subject(2, 'English', 75)] }),
      exam(2, { subjects: [subject(1, 'Mathematics', 30), subject(2, 'English', 75)] }),
    ]);
    expect(weakSubject.subjects.find((row) => row.name === 'Mathematics')!.passed).toBe(false);
    expect(weakSubject.overall.result).toBe('fail');
    expect(weakSubject.remarks).toMatch(/pass mark/);
  });

  it('is incomplete with no complete exam', () => {
    const card = buildReportCard([]);
    expect(card.overall).toEqual({ total: 0, max_total: 0, percent: null, grade: null, result: 'incomplete' });
    expect(card.columns).toEqual([]);
  });

  it('shows the common max marks only when every paper has the same', () => {
    const card = buildReportCard([
      exam(1),
      exam(2, {
        subjects: [subject(1, 'Mathematics', 20, { max_marks: 25 }), subject(2, 'English', 40, { max_marks: 50 })],
      }),
    ]);
    expect(card.columns[0]!.common_max).toBe(100);
    expect(card.columns[1]!.common_max).toBeNull();
  });

  it('writes a remark that matches the score', () => {
    const base = { total: 0, max_total: 0, grade: null };
    expect(remarkFor({ ...base, percent: 95, result: 'pass' })).toMatch(/Outstanding/);
    expect(remarkFor({ ...base, percent: 65, result: 'pass' })).toMatch(/Good effort/);
    expect(remarkFor({ ...base, percent: null, result: 'incomplete' })).toMatch(/once marks are published/);
  });

  it('counts late as present and a half day as half', () => {
    expect(
      attendanceSummary([
        { status: 'present', days: 90 },
        { status: 'late', days: 4 },
        { status: 'half_day', days: 2 },
        { status: 'absent', days: 3 },
        { status: 'leave', days: 1 },
      ]),
    ).toEqual({ working_days: 100, present_days: 95, percent: 95 });
    expect(attendanceSummary([])).toEqual({ working_days: 0, present_days: 0, percent: null });
  });

  it('describes the grading scale with ranges', () => {
    const scale = gradeScale();
    expect(scale[0]).toEqual({ grade: 'A1', min: 91, max: 100 });
    expect(scale[1]).toEqual({ grade: 'A2', min: 81, max: 90 });
    expect(scale[scale.length - 1]).toEqual({ grade: 'E', min: 0, max: 32 });
  });
});
