import {
  competitionRanks,
  gradeFor,
  GRADE_SCALE,
  percentOf,
  scoreStudent,
  SubjectScore,
  subjectPassed,
  validateMarks,
} from './exam-results';

const paper = (marks: number | null, options: Partial<SubjectScore> = {}): SubjectScore => ({
  subject_id: 1,
  max_marks: 100,
  pass_marks: 35,
  marks,
  is_absent: false,
  entered: marks !== null,
  ...options,
});

describe('exam results', () => {
  describe('gradeFor', () => {
    it.each([
      [100, 'A1'],
      [91, 'A1'],
      [90.9, 'A2'],
      [81, 'A2'],
      [71, 'B1'],
      [61, 'B2'],
      [51, 'C1'],
      [41, 'C2'],
      [33, 'D'],
      [32.9, 'E'],
      [0, 'E'],
    ])('%s%% is %s', (percent, grade) => {
      expect(gradeFor(percent)).toBe(grade);
    });

    it('keeps the scale in descending order ending at 0', () => {
      const mins = GRADE_SCALE.map((step) => step.min);
      expect([...mins].sort((a, b) => b - a)).toEqual(mins);
      expect(mins[mins.length - 1]).toBe(0);
    });
  });

  describe('percentOf', () => {
    it('rounds to one decimal', () => {
      expect(percentOf(452, 500)).toBe(90.4);
      expect(percentOf(2, 3)).toBe(66.7);
      expect(percentOf(1, 3)).toBe(33.3);
    });

    it('is 0 when there is nothing to score', () => {
      expect(percentOf(0, 0)).toBe(0);
    });
  });

  describe('scoreStudent', () => {
    it('passes with every subject at or above pass marks', () => {
      expect(scoreStudent([paper(35), paper(90), paper(80.5)])).toEqual({
        total: 205.5,
        max_total: 300,
        percent: 68.5,
        grade: 'B2',
        result: 'pass',
      });
    });

    it('fails when one subject is below pass marks even with a high total', () => {
      const result = scoreStudent([paper(99), paper(98), paper(34)]);
      expect(result.result).toBe('fail');
      expect(result.grade).toBe('B1');
    });

    it('fails when absent in a subject and counts it as zero', () => {
      const result = scoreStudent([paper(90), paper(null, { is_absent: true, entered: true })]);
      expect(result).toMatchObject({ total: 90, max_total: 200, percent: 45, result: 'fail' });
    });

    it('is incomplete with a missing mark and has no percent or grade', () => {
      expect(scoreStudent([paper(90), paper(null)])).toEqual({
        total: 90,
        max_total: 200,
        percent: null,
        grade: null,
        result: 'incomplete',
      });
    });

    it('is incomplete with no papers', () => {
      expect(scoreStudent([]).result).toBe('incomplete');
    });

    it('uses each paper’s own max and pass marks', () => {
      const result = scoreStudent([paper(20, { max_marks: 50, pass_marks: 18 }), paper(40)]);
      expect(result).toMatchObject({ total: 60, max_total: 150, percent: 40, grade: 'D', result: 'pass' });
    });
  });

  describe('subjectPassed', () => {
    it('is null until entered', () => {
      expect(subjectPassed(paper(null))).toBeNull();
      expect(subjectPassed(paper(35))).toBe(true);
      expect(subjectPassed(paper(34.5))).toBe(false);
    });
  });

  describe('competitionRanks', () => {
    it('gives equal totals the same rank and skips the next ones (1, 2, 2, 4)', () => {
      expect(competitionRanks([400, 450, 450, 480])).toEqual([4, 2, 2, 1]);
    });

    it('handles a tie at the top', () => {
      expect(competitionRanks([90, 90, 80])).toEqual([1, 1, 3]);
    });

    it('leaves incomplete students unranked and does not count them', () => {
      expect(competitionRanks([300, null, 320, 300, null])).toEqual([2, null, 1, 2, null]);
    });

    it('works with decimals and an empty list', () => {
      expect(competitionRanks([75.5, 75.25, 75.5])).toEqual([1, 3, 1]);
      expect(competitionRanks([])).toEqual([]);
    });
  });

  describe('validateMarks', () => {
    const names = new Map([
      [1, 'Kavin'],
      [2, 'Meera'],
    ]);

    it('accepts 0, the max, absences and cleared entries', () => {
      expect(
        validateMarks(
          [
            { student_id: 1, marks: 0, is_absent: false },
            { student_id: 2, marks: 100, is_absent: false },
            { student_id: 1, marks: null, is_absent: true },
            { student_id: 2, marks: null, is_absent: false },
          ],
          100,
          names,
        ),
      ).toEqual([]);
    });

    it('rejects marks above max or below zero with the row index and name', () => {
      expect(
        validateMarks(
          [
            { student_id: 1, marks: 101, is_absent: false },
            { student_id: 2, marks: -1, is_absent: false },
          ],
          100,
          names,
        ),
      ).toEqual([
        { index: 0, message: 'Marks for Kavin must be between 0 and 100' },
        { index: 1, message: 'Marks for Meera must be between 0 and 100' },
      ]);
    });

    it('ignores marks sent with an absence', () => {
      expect(validateMarks([{ student_id: 1, marks: 500, is_absent: true }], 50, names)).toEqual([]);
    });
  });
});
