import { Column, Entity, Index } from 'typeorm';
import { SchoolScopedEntity } from '@app/common';

@Entity('fee_heads')
@Index('UQ_fee_heads_school_code', ['school_id', 'code'], { unique: true, where: 'deleted_at IS NULL' })
export class FeeHead extends SchoolScopedEntity {
  @Column({ type: 'varchar', length: 60 })
  name: string;

  @Column({ type: 'varchar', length: 20 })
  code: string;

  @Column({ type: 'boolean', default: false })
  is_transport: boolean;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;
}
