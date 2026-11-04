import { MigrationInterface, QueryRunner } from 'typeorm';

export class VideoMeetings1793769400209 implements MigrationInterface {
  name = 'VideoMeetings1793769400209';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "meetings" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "created_by" integer, "school_id" integer NOT NULL, "student_id" integer NOT NULL, "teacher_user_id" integer NOT NULL, "parent_user_id" integer NOT NULL, "scheduled_by" character varying(10) NOT NULL, "title" character varying(150) NOT NULL, "agenda" character varying(500), "scheduled_at" TIMESTAMP WITH TIME ZONE NOT NULL, "duration_minutes" smallint NOT NULL DEFAULT '15', "status" character varying(12) NOT NULL DEFAULT 'scheduled', "channel_name" character varying(64) NOT NULL, "started_at" TIMESTAMP WITH TIME ZONE, "ended_at" TIMESTAMP WITH TIME ZONE, "ended_by" integer, "cancelled_by" integer, "cancel_reason" character varying(255), "reminder_sent_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_aa73be861afa77eb4ed31f3ed57" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_8fb3604a298e5aaf63b0f40bbc" ON "meetings" ("school_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_1c6206fdc6d2675ef8cbe21493" ON "meetings" ("student_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_0cdb7c28fb61899854950c424d" ON "meetings" ("teacher_user_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_2f5384702ef17d16d78d5ecf5c" ON "meetings" ("parent_user_id") `);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_c51cf11b75744ecde0fd63e0ce" ON "meetings" ("channel_name") `);
    await queryRunner.query(
      `CREATE INDEX "IDX_meetings_school_scheduled" ON "meetings" ("school_id", "scheduled_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "meeting_call_logs" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "school_id" integer NOT NULL, "meeting_id" integer NOT NULL, "user_id" integer NOT NULL, "party" character varying(10) NOT NULL, "platform" character varying(10) NOT NULL, "joined_at" TIMESTAMP WITH TIME ZONE NOT NULL, "left_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_0461ab1cc6225741d24d88b5297" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_704b5a71d2abfb89ac4aeeb6e6" ON "meeting_call_logs" ("school_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_75abb8548c6cf981df6656b6e1" ON "meeting_call_logs" ("meeting_id") `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_75abb8548c6cf981df6656b6e1"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_704b5a71d2abfb89ac4aeeb6e6"`);
    await queryRunner.query(`DROP TABLE "meeting_call_logs"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_meetings_school_scheduled"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_c51cf11b75744ecde0fd63e0ce"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_2f5384702ef17d16d78d5ecf5c"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_0cdb7c28fb61899854950c424d"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_1c6206fdc6d2675ef8cbe21493"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_8fb3604a298e5aaf63b0f40bbc"`);
    await queryRunner.query(`DROP TABLE "meetings"`);
  }
}
