import { ColumnOptions } from 'typeorm';

export const decimal = (precision: number, scale: number, nullable = true): ColumnOptions => ({
  type: 'numeric',
  precision,
  scale,
  nullable,
  transformer: {
    to: (value: number | null | undefined) => value,
    from: (value: string | null) => (value === null ? null : Number(value)),
  },
});
