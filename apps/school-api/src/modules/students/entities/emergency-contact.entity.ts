import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Student } from './student.entity';

@Entity('emergency_contacts')
export class EmergencyContact {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'int' })
  student_id: number;

  @ManyToOne(() => Student, (student) => student.emergency_contacts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student?: Student;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'varchar', length: 40 })
  relation: string;

  @Column({ type: 'varchar', length: 10 })
  mobile: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
