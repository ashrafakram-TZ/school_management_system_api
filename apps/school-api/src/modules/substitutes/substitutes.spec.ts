import { groupSize, rankCandidates, weekRange } from './substitutes.service';

const candidate = (name: string, overrides: Partial<Parameters<typeof rankCandidates>[0][number]> = {}) => ({
  name,
  same_subject: false,
  knows_section: false,
  periods_today: 4,
  substitutions_this_week: 0,
  ...overrides,
});

describe('rankCandidates', () => {
  it('puts a teacher of the same subject first', () => {
    const ranked = rankCandidates([candidate('Anu'), candidate('Bala', { same_subject: true, periods_today: 6 })]);
    expect(ranked.map((row) => row.name)).toEqual(['Bala', 'Anu']);
  });

  it('then prefers a teacher who already knows the class', () => {
    const ranked = rankCandidates([candidate('Anu'), candidate('Bala', { knows_section: true })]);
    expect(ranked[0]!.name).toBe('Bala');
  });

  it('then the lightest day, then fewest covers this week', () => {
    const ranked = rankCandidates([
      candidate('Anu', { periods_today: 5 }),
      candidate('Bala', { periods_today: 3, substitutions_this_week: 2 }),
      candidate('Chitra', { periods_today: 3 }),
    ]);
    expect(ranked.map((row) => row.name)).toEqual(['Chitra', 'Bala', 'Anu']);
  });

  it('does not change the input order', () => {
    const rows = [candidate('Bala'), candidate('Anu')];
    rankCandidates(rows);
    expect(rows[0]!.name).toBe('Bala');
  });
});

describe('weekRange', () => {
  it('covers Monday to Saturday of the week', () => {
    expect(weekRange('2026-11-04')).toEqual({ from: '2026-11-02', to: '2026-11-07' });
  });

  it('treats Sunday as the end of the week before', () => {
    expect(weekRange('2026-11-08')).toEqual({ from: '2026-11-02', to: '2026-11-07' });
  });
});

describe('groupSize', () => {
  const counts = { total: 32, boys: 17, girls: 15 };

  it('sends the whole class, only the boys or only the girls', () => {
    expect(groupSize(counts, 'all')).toBe(32);
    expect(groupSize(counts, 'boys')).toBe(17);
    expect(groupSize(counts, 'girls')).toBe(15);
  });

  it('is zero for a section with no students', () => {
    expect(groupSize(undefined, 'all')).toBe(0);
  });
});
