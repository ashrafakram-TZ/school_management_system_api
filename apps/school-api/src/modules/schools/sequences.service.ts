import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';

@Injectable()
export class SequencesService {
  async next(manager: EntityManager, schoolId: number, key: string): Promise<number> {
    const rows: { value: number }[] = await manager.query(
      `INSERT INTO number_sequences (school_id, key, value, updated_at) VALUES ($1, $2, 1, now())
       ON CONFLICT (school_id, key) DO UPDATE SET value = number_sequences.value + 1, updated_at = now()
       RETURNING value`,
      [schoolId, key],
    );
    return Number(rows[0].value);
  }

  static format(prefix: string, year: string | number, value: number): string {
    return `${prefix}-${year}-${String(value).padStart(4, '0')}`;
  }
}
