export const ROSTER_SORTS = ['roll_no', 'name', 'rank'] as const;
export type RosterSort = (typeof ROSTER_SORTS)[number];

export const SORT_ORDERS = ['asc', 'desc'] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

export interface RosterRow {
  full_name: string;
  roll_no: number | null;
  rank: number | null;
}

const ORDINALS = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth'];

const keyOf = (row: RosterRow, sort: RosterSort): number | string | null =>
  sort === 'name' ? row.full_name.toLocaleLowerCase('en-IN') : sort === 'rank' ? row.rank : row.roll_no;

export function sortRoster<T extends RosterRow>(rows: T[], sort: RosterSort, order: SortOrder): T[] {
  const direction = order === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => {
    const left = keyOf(a, sort);
    const right = keyOf(b, sort);
    if (left === null && right === null) return a.full_name.localeCompare(b.full_name);
    if (left === null) return 1;
    if (right === null) return -1;
    const compared = typeof left === 'string' ? left.localeCompare(right as string) : left - (right as number);
    return compared * direction || a.full_name.localeCompare(b.full_name);
  });
}

export function groupLabel(index: number, total: number): string {
  if (total > 1 && index === total - 1) return 'Last';
  return ORDINALS[index] ?? `Group ${index + 1}`;
}

export function splitIntoGroups<T>(rows: T[], groups: number): T[][] {
  const count = Math.max(1, Math.min(groups, rows.length || 1));
  const base = Math.floor(rows.length / count);
  const extra = rows.length % count;
  const result: T[][] = [];
  let start = 0;
  for (let index = 0; index < count; index += 1) {
    const size = base + (index < extra ? 1 : 0);
    result.push(rows.slice(start, start + size));
    start += size;
  }
  return result;
}
