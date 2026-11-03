import { Column, Entity, Index } from 'typeorm';
import { SchoolScopedEntity } from '@app/common';
import { money } from './money';

@Entity('salary_structures')
@Index('UQ_salary_structures_user', ['user_id'], { unique: true, where: 'deleted_at IS NULL' })
export class SalaryStructure extends SchoolScopedEntity {
  @Column({ type: 'int' })
  user_id: number;

  @Column({ type: 'date' })
  effective_from: string;

  @Column(money())
  basic: number;

  @Column(money())
  da: number;

  @Column(money())
  hra: number;

  @Column(money())
  conveyance: number;

  @Column(money())
  special_allowance: number;

  @Column(money())
  other_allowance: number;

  @Column({ type: 'boolean', default: true })
  pf_enabled: boolean;

  @Column({ type: 'boolean', default: false })
  esi_enabled: boolean;

  @Column(money())
  professional_tax: number;

  @Column(money())
  tds: number;

  @Column(money())
  other_deduction: number;
}
