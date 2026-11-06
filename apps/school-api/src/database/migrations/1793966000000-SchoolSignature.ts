import { MigrationInterface, QueryRunner } from 'typeorm';

export class SchoolSignature1793966000000 implements MigrationInterface {
  name = 'SchoolSignature1793966000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "schools"
      ADD COLUMN IF NOT EXISTS "signature_file_id" integer
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "schools"
      DROP COLUMN IF EXISTS "signature_file_id"
    `);
  }
}

