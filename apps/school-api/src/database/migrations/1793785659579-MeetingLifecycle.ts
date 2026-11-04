import { MigrationInterface, QueryRunner } from 'typeorm';

export class MeetingLifecycle1793785659579 implements MigrationInterface {
  name = 'MeetingLifecycle1793785659579';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "meeting_call_logs" ADD "source" character varying(6) NOT NULL DEFAULT 'app'`);
    await queryRunner.query(`ALTER TABLE "meeting_call_logs" ADD "confirmed_at" TIMESTAMP WITH TIME ZONE`);
    await queryRunner.query(`ALTER TABLE "meeting_call_logs" ADD "leave_reason" character varying(30)`);
    await queryRunner.query(`ALTER TABLE "meeting_call_logs" ADD "client_seq" bigint`);
    await queryRunner.query(`ALTER TABLE "meetings" ADD "academic_year_id" integer`);
    await queryRunner.query(`ALTER TABLE "meetings" ADD "scheduled_end_at" TIMESTAMP WITH TIME ZONE`);
    await queryRunner.query(`ALTER TABLE "meetings" ADD "extended_minutes" smallint NOT NULL DEFAULT '0'`);
    await queryRunner.query(`ALTER TABLE "meetings" ADD "extended_at" TIMESTAMP WITH TIME ZONE`);
    await queryRunner.query(`ALTER TABLE "meetings" ADD "extended_by" integer`);
    await queryRunner.query(`ALTER TABLE "meetings" ADD "end_reason" character varying(12)`);
    await queryRunner.query(`ALTER TABLE "meetings" ADD "end_reminder_sent_at" TIMESTAMP WITH TIME ZONE`);
    await queryRunner.query(`ALTER TABLE "meetings" ADD "agora_kick_rule_id" character varying(20)`);
    await queryRunner.query(`ALTER TABLE "meetings" ALTER COLUMN "status" TYPE character varying(15)`);
    await queryRunner.query(`UPDATE "meetings" SET "status" = 'in_progress' WHERE "status" = 'live'`);
    await queryRunner.query(
      `UPDATE "meetings" m SET "scheduled_end_at" = m."scheduled_at" + make_interval(mins => m."duration_minutes")`,
    );
    await queryRunner.query(
      `UPDATE "meetings" m SET "academic_year_id" = COALESCE(
         (SELECT y.id FROM academic_years y WHERE y.school_id = m.school_id AND y.is_current AND y.deleted_at IS NULL LIMIT 1),
         (SELECT y.id FROM academic_years y WHERE y.school_id = m.school_id ORDER BY y.start_date DESC LIMIT 1))`,
    );
    await queryRunner.query(`UPDATE "meetings" SET "end_reason" = 'host_ended' WHERE "status" = 'completed'`);
    await queryRunner.query(
      `DELETE FROM "meeting_call_logs" WHERE "meeting_id" IN (SELECT id FROM "meetings" WHERE "academic_year_id" IS NULL)`,
    );
    await queryRunner.query(`DELETE FROM "meetings" WHERE "academic_year_id" IS NULL`);
    await queryRunner.query(`ALTER TABLE "meetings" ALTER COLUMN "academic_year_id" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "meetings" ALTER COLUMN "scheduled_end_at" SET NOT NULL`);
    await queryRunner.query(`CREATE INDEX "IDX_a9bb3b5dd8d76a9f379a1268f6" ON "meetings" ("academic_year_id") `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_a9bb3b5dd8d76a9f379a1268f6"`);
    await queryRunner.query(
      `UPDATE "meetings" SET "status" = 'live' WHERE "status" IN ('in_progress', 'time_exceeded')`,
    );
    await queryRunner.query(`ALTER TABLE "meetings" ALTER COLUMN "status" TYPE character varying(12)`);
    await queryRunner.query(`ALTER TABLE "meetings" DROP COLUMN "agora_kick_rule_id"`);
    await queryRunner.query(`ALTER TABLE "meetings" DROP COLUMN "end_reminder_sent_at"`);
    await queryRunner.query(`ALTER TABLE "meetings" DROP COLUMN "end_reason"`);
    await queryRunner.query(`ALTER TABLE "meetings" DROP COLUMN "extended_by"`);
    await queryRunner.query(`ALTER TABLE "meetings" DROP COLUMN "extended_at"`);
    await queryRunner.query(`ALTER TABLE "meetings" DROP COLUMN "extended_minutes"`);
    await queryRunner.query(`ALTER TABLE "meetings" DROP COLUMN "scheduled_end_at"`);
    await queryRunner.query(`ALTER TABLE "meetings" DROP COLUMN "academic_year_id"`);
    await queryRunner.query(`ALTER TABLE "meeting_call_logs" DROP COLUMN "client_seq"`);
    await queryRunner.query(`ALTER TABLE "meeting_call_logs" DROP COLUMN "leave_reason"`);
    await queryRunner.query(`ALTER TABLE "meeting_call_logs" DROP COLUMN "confirmed_at"`);
    await queryRunner.query(`ALTER TABLE "meeting_call_logs" DROP COLUMN "source"`);
  }
}
