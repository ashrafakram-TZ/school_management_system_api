import { MigrationInterface, QueryRunner } from 'typeorm';

export class CentralAuthLink1793693332559 implements MigrationInterface {
  name = 'CentralAuthLink1793693332559';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "auth_user_id" character varying(40)`);
    await queryRunner.query(`ALTER TABLE "users" ADD "auth_registered_at" TIMESTAMP WITH TIME ZONE`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "auth_registered_at"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "auth_user_id"`);
  }
}
