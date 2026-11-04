import { groupLabel, sortRoster, splitIntoGroups } from './roster.logic';

const rows = [
  { full_name: 'Kavin Narayanan', roll_no: 3, rank: 2 },
  { full_name: 'Aadhavan Senthil', roll_no: 1, rank: null },
  { full_name: 'Janani Bala', roll_no: null, rank: 1 },
  { full_name: 'Ishwarya Suresh', roll_no: 2, rank: 2 },
];

describe('sortRoster', () => {
  it('orders by roll number and keeps students without one last', () => {
    expect(sortRoster(rows, 'roll_no', 'asc').map((row) => row.roll_no)).toEqual([1, 2, 3, null]);
    expect(sortRoster(rows, 'roll_no', 'desc').map((row) => row.roll_no)).toEqual([3, 2, 1, null]);
  });

  it('orders by rank with ties by name and unranked last', () => {
    expect(sortRoster(rows, 'rank', 'asc').map((row) => row.full_name)).toEqual([
      'Janani Bala',
      'Ishwarya Suresh',
      'Kavin Narayanan',
      'Aadhavan Senthil',
    ]);
    expect(sortRoster(rows, 'rank', 'desc').map((row) => row.rank)).toEqual([2, 2, 1, null]);
  });

  it('orders by name either way', () => {
    expect(sortRoster(rows, 'name', 'desc')[0]!.full_name).toBe('Kavin Narayanan');
  });
});

describe('splitIntoGroups', () => {
  const students = (count: number) => Array.from({ length: count }, (_, index) => index + 1);

  it('gives 10, 10, 10 for 30 students in 3 groups', () => {
    expect(splitIntoGroups(students(30), 3).map((group) => group.length)).toEqual([10, 10, 10]);
  });

  it('puts the extra students in the front groups', () => {
    expect(splitIntoGroups(students(31), 3).map((group) => group.length)).toEqual([11, 10, 10]);
    expect(splitIntoGroups(students(32), 3).map((group) => group.length)).toEqual([11, 11, 10]);
  });

  it('keeps the order and never makes empty groups', () => {
    expect(splitIntoGroups(students(5), 3)).toEqual([[1, 2], [3, 4], [5]]);
    expect(splitIntoGroups(students(2), 3)).toEqual([[1], [2]]);
    expect(splitIntoGroups([], 3)).toEqual([[]]);
  });

  it('names the groups First, Second … Last', () => {
    expect([0, 1, 2].map((index) => groupLabel(index, 3))).toEqual(['First', 'Second', 'Last']);
    expect([0, 1, 2, 3].map((index) => groupLabel(index, 4))).toEqual(['First', 'Second', 'Third', 'Last']);
  });
});
