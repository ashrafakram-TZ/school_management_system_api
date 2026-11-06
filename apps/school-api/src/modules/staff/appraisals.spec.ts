import { calculateRating } from './appraisals.service';

describe('AppraisalsService - calculateRating', () => {
  it('returns outstanding for score >= 4.6', () => {
    expect(calculateRating(4.8)).toBe('outstanding');
    expect(calculateRating(4.6)).toBe('outstanding');
  });

  it('returns exceeds_expectations for score >= 3.8 and < 4.6', () => {
    expect(calculateRating(4.5)).toBe('exceeds_expectations');
    expect(calculateRating(3.8)).toBe('exceeds_expectations');
  });

  it('returns meets_expectations for score >= 3.0 and < 3.8', () => {
    expect(calculateRating(3.5)).toBe('meets_expectations');
    expect(calculateRating(3.0)).toBe('meets_expectations');
  });

  it('returns needs_improvement for score >= 2.0 and < 3.0', () => {
    expect(calculateRating(2.5)).toBe('needs_improvement');
    expect(calculateRating(2.0)).toBe('needs_improvement');
  });

  it('returns unsatisfactory for score < 2.0', () => {
    expect(calculateRating(1.8)).toBe('unsatisfactory');
    expect(calculateRating(1.0)).toBe('unsatisfactory');
  });
});
