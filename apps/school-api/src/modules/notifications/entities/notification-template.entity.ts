import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Language } from '../../users/entities/user.entity';
import { NotificationCategory } from './notification.entity';

export const SMS_MODES = ['never', 'fallback', 'always'] as const;
export type SmsMode = (typeof SMS_MODES)[number];

@Entity('notification_templates')
@Index('UQ_notification_templates_code_language', ['code', 'language'], { unique: true })
export class NotificationTemplate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 60 })
  code: string;

  @Column({ type: 'varchar', length: 5 })
  language: Language;

  @Column({ type: 'varchar', length: 20 })
  category: NotificationCategory;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'text', nullable: true })
  sms_body: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  dlt_template_id: string | null;

  @Column({ type: 'boolean', default: true })
  push: boolean;

  @Column({ type: 'varchar', length: 10, default: 'never' })
  sms: SmsMode;

  @Column({ type: 'boolean', default: false })
  critical: boolean;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
