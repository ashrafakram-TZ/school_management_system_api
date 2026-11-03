import { MigrationInterface, QueryRunner } from 'typeorm';

export class StudentIdentificationMarks1793681427701 implements MigrationInterface {
  name = 'StudentIdentificationMarks1793681427701';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "students" ADD "identification_marks" character varying(255)`);
    await queryRunner.query(`ALTER TABLE "admissions" ADD "identification_marks" character varying(255)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "admissions" DROP COLUMN "identification_marks"`);
    await queryRunner.query(`ALTER TABLE "students" DROP COLUMN "identification_marks"`);
  }
}
