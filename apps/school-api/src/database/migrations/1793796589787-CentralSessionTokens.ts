import { MigrationInterface, QueryRunner } from 'typeorm';

export class CentralSessionTokens1793796589787 implements MigrationInterface {
  name = 'CentralSessionTokens1793796589787';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user_sessions" ADD "central_access_enc" text`);
    await queryRunner.query(`ALTER TABLE "user_sessions" ADD "central_refresh_enc" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user_sessions" DROP COLUMN "central_refresh_enc"`);
    await queryRunner.query(`ALTER TABLE "user_sessions" DROP COLUMN "central_access_enc"`);
  }
}
