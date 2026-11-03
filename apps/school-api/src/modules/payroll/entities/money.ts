import { ColumnOptions } from 'typeorm';

export const money = (options: ColumnOptions = {}): ColumnOptions => ({
  type: 'numeric',
  precision: 12,
  scale: 2,
  default: 0,
  transformer: { to: (value: number | null) => value, from: (value: string | null) => Number(value ?? 0) },
  ...options,
});
