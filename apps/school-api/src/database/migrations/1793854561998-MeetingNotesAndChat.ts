import { MigrationInterface, QueryRunner } from 'typeorm';

export class MeetingNotesAndChat1793854561998 implements MigrationInterface {
  name = 'MeetingNotesAndChat1793854561998';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "meeting_notes" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "created_by" integer, "school_id" integer NOT NULL, "meeting_id" integer NOT NULL, "author_user_id" integer NOT NULL, "author_party" character varying(10) NOT NULL, "body" text NOT NULL, "shared" boolean NOT NULL DEFAULT false, "shared_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_24248684e8ac266a4bc2ba64475" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_e66a696749b1671d5b00bbaef2" ON "meeting_notes" ("school_id") `);
    await queryRunner.query(
      `CREATE INDEX "IDX_meeting_notes_meeting" ON "meeting_notes" ("meeting_id", "created_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "meeting_messages" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "created_by" integer, "school_id" integer NOT NULL, "meeting_id" integer NOT NULL, "sender_user_id" integer NOT NULL, "sender_party" character varying(10) NOT NULL, "body" character varying(2000), "file_id" integer, CONSTRAINT "PK_43ea6e320985071d04f365b38c4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_f4d524be2d0dddb3a56183cc21" ON "meeting_messages" ("school_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_meeting_messages_meeting" ON "meeting_messages" ("meeting_id", "id") `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_meeting_messages_meeting"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_f4d524be2d0dddb3a56183cc21"`);
    await queryRunner.query(`DROP TABLE "meeting_messages"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_meeting_notes_meeting"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_e66a696749b1671d5b00bbaef2"`);
    await queryRunner.query(`DROP TABLE "meeting_notes"`);
  }
}
