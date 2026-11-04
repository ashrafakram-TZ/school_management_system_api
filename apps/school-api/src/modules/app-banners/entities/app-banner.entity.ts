import { Column, Entity, Index } from 'typeorm';
import { SchoolScopedEntity } from '@app/common';

export const BANNER_AUDIENCES = ['all', 'staff', 'parents'] as const;
export type BannerAudience = (typeof BANNER_AUDIENCES)[number];

@Entity('app_banners')
@Index('IDX_app_banners_school_dates', ['school_id', 'starts_on', 'ends_on'])
export class AppBanner extends SchoolScopedEntity {
  @Column({ type: 'varchar', length: 80 })
  title: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  message: string | null;

  @Column({ type: 'int', nullable: true })
  image_file_id: number | null;

  @Column({ type: 'varchar', length: 10, default: 'all' })
  audience: BannerAudience;

  @Column({ type: 'date' })
  starts_on: string;

  @Column({ type: 'date' })
  ends_on: string;

  @Column({ type: 'varchar', length: 300, nullable: true })
  link_url: string | null;

  @Column({ type: 'smallint', default: 0 })
  sort_order: number;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;
}
