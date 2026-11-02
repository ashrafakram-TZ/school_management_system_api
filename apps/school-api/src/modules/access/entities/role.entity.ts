import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Permission } from './permission.entity';

export const APP_SECTIONS = ['admin', 'staff', 'parent', 'driver'] as const;
export type AppSection = (typeof APP_SECTIONS)[number];

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn()
  id: number;

  @Index('UQ_roles_code', { unique: true })
  @Column({ type: 'varchar', length: 40 })
  code: string;

  @Column({ type: 'varchar', length: 80 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 10 })
  app: AppSection;

  @Column({ type: 'boolean', default: true })
  is_system: boolean;

  @Column({ type: 'smallint', default: 0 })
  sort_order: number;

  @ManyToMany(() => Permission)
  @JoinTable({
    name: 'role_permissions',
    joinColumn: { name: 'role_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permission_id', referencedColumnName: 'id' },
  })
  permissions: Permission[];

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
