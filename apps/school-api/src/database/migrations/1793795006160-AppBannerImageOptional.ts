import { MigrationInterface, QueryRunner } from 'typeorm';

export class AppBannerImageOptional1793795006160 implements MigrationInterface {
  name = 'AppBannerImageOptional1793795006160';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "app_banners" ALTER COLUMN "image_file_id" DROP NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "app_banners" ALTER COLUMN "image_file_id" SET NOT NULL`);
  }
}
