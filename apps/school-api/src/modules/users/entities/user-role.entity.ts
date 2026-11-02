import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Role } from '../../access/entities/role.entity';
import { User } from './user.entity';

@Entity('user_roles')
@Index('UQ_user_roles_user_role', ['user_id', 'role_id'], { unique: true })
export class UserRole {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  user_id: number;

  @ManyToOne(() => User, (user) => user.user_roles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Index()
  @Column({ type: 'int' })
  role_id: number;

  @ManyToOne(() => Role, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'role_id' })
  role?: Role;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
