import { MigrationInterface, QueryRunner } from 'typeorm';

export class SportsActivities1793766330489 implements MigrationInterface {
  name = 'SportsActivities1793766330489';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "student_achievements" ADD "result" character varying(15) NOT NULL DEFAULT 'participated'`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_achievements" ADD "event_scope" character varying(15) NOT NULL DEFAULT 'in_school'`,
    );
    await queryRunner.query(`ALTER TABLE "student_achievements" ADD "venue_type" character varying(10)`);
    await queryRunner.query(
      `ALTER TABLE "student_achievements" ADD "participation" character varying(12) NOT NULL DEFAULT 'individual'`,
    );
    await queryRunner.query(`ALTER TABLE "student_achievements" ADD "team_name" character varying(80)`);
    await queryRunner.query(`ALTER TABLE "student_achievements" ADD "prize_received" character varying(120)`);
    await queryRunner.query(`ALTER TABLE "student_achievements" ADD "school_reward" character varying(120)`);
    await queryRunner.query(`ALTER TABLE "student_achievements" ADD "points" smallint NOT NULL DEFAULT '0'`);
    await queryRunner.query(
      `CREATE INDEX "IDX_student_achievements_school_category" ON "student_achievements" ("school_id", "category", "achieved_on") `,
    );
    await queryRunner.query(`UPDATE "student_achievements" SET "result" = CASE
            WHEN "position" ~* '(^|\D)1(st)?(\D|$)|first|winner|gold' THEN 'winner'
            WHEN "position" ~* '(^|\D)2(nd)?(\D|$)|second|runner|silver' THEN 'runner_up'
            WHEN "position" ~* '(^|\D)3(rd)?(\D|$)|third|bronze' THEN 'third_place'
            ELSE 'participated' END`);
    await queryRunner.query(`UPDATE "student_achievements" SET "points" =
            (CASE "level" WHEN 'class' THEN 1 WHEN 'school' THEN 2 WHEN 'zone' THEN 3 WHEN 'district' THEN 5
              WHEN 'state' THEN 8 WHEN 'national' THEN 12 WHEN 'international' THEN 15 ELSE 0 END)
            * (CASE "result" WHEN 'winner' THEN 4 WHEN 'runner_up' THEN 3 WHEN 'third_place' THEN 2 ELSE 1 END)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_student_achievements_school_category"`);
    await queryRunner.query(`ALTER TABLE "student_achievements" DROP COLUMN "points"`);
    await queryRunner.query(`ALTER TABLE "student_achievements" DROP COLUMN "school_reward"`);
    await queryRunner.query(`ALTER TABLE "student_achievements" DROP COLUMN "prize_received"`);
    await queryRunner.query(`ALTER TABLE "student_achievements" DROP COLUMN "team_name"`);
    await queryRunner.query(`ALTER TABLE "student_achievements" DROP COLUMN "participation"`);
    await queryRunner.query(`ALTER TABLE "student_achievements" DROP COLUMN "venue_type"`);
    await queryRunner.query(`ALTER TABLE "student_achievements" DROP COLUMN "event_scope"`);
    await queryRunner.query(`ALTER TABLE "student_achievements" DROP COLUMN "result"`);
  }
}
