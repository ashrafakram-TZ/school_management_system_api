import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Staff } from './staff.entity';

@Entity('staff_qualifications')
export class StaffQualification {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'int' })
  staff_id: number;

  @ManyToOne(() => Staff, (staff) => staff.qualifications, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'staff_id' })
  staff?: Staff;

  @Column({ type: 'varchar', length: 60 })
  degree: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  specialization: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  institution: string | null;

  @Column({ type: 'smallint', nullable: true })
  year_completed: number | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
