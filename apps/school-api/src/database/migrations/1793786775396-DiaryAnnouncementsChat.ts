import { MigrationInterface, QueryRunner } from 'typeorm';

export class DiaryAnnouncementsChat1793786775396 implements MigrationInterface {
  name = 'DiaryAnnouncementsChat1793786775396';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "diary_entries" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "created_by" integer, "school_id" integer NOT NULL, "academic_year_id" integer NOT NULL, "type" character varying(10) NOT NULL, "scope" character varying(10) NOT NULL, "class_id" integer, "section_id" integer, "subject_id" integer, "title" character varying(150) NOT NULL, "body" character varying(2000) NOT NULL, "due_date" date, "status" character varying(15) NOT NULL, "reviewed_by" integer, "reviewed_at" TIMESTAMP WITH TIME ZONE, "review_note" character varying(255), "published_at" TIMESTAMP WITH TIME ZONE, "recipient_count" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_45cc0613be17fab8a954db677a0" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_137ab1536b6e318054d57d7259" ON "diary_entries" ("school_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_3f60043772170c26751aa61bdf" ON "diary_entries" ("academic_year_id") `);
    await queryRunner.query(
      `CREATE INDEX "IDX_diary_entries_school_year_status" ON "diary_entries" ("school_id", "academic_year_id", "status") `,
    );
    await queryRunner.query(
      `CREATE TABLE "diary_recipients" ("id" SERIAL NOT NULL, "school_id" integer NOT NULL, "entry_id" integer NOT NULL, "student_id" integer NOT NULL, "seen_at" TIMESTAMP WITH TIME ZONE, "seen_by" integer, CONSTRAINT "PK_5756a6a7a4651508d177a16306c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_2ddfeec0bf50e7868353577d48" ON "diary_recipients" ("school_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_614fec270d9749e1dd832dd660" ON "diary_recipients" ("entry_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_cdd9c3eff9976707ed73ff9a3a" ON "diary_recipients" ("student_id") `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_diary_recipients_entry_student" ON "diary_recipients" ("entry_id", "student_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "diary_attachments" ("id" SERIAL NOT NULL, "entry_id" integer NOT NULL, "file_id" integer NOT NULL, "sort_order" smallint NOT NULL DEFAULT '0', CONSTRAINT "PK_53a2c53c4f5e0fbf644d7179dc5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_b1b5c9224993f2d2ffa64e856c" ON "diary_attachments" ("entry_id") `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_diary_attachments_entry_file" ON "diary_attachments" ("entry_id", "file_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "chat_threads" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "created_by" integer, "school_id" integer NOT NULL, "academic_year_id" integer NOT NULL, "teacher_user_id" integer NOT NULL, "parent_user_id" integer NOT NULL, "student_id" integer NOT NULL, "last_message_at" TIMESTAMP WITH TIME ZONE, "last_message_preview" character varying(160), "last_sender_id" integer, "teacher_unread" integer NOT NULL DEFAULT '0', "parent_unread" integer NOT NULL DEFAULT '0', "message_count" integer NOT NULL DEFAULT '0', "open_flags" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_973a81c0adb9b18a5ea3ef95bf8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_b1824d8e6a24aaad88908c6822" ON "chat_threads" ("school_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_a3efad25f3ca50cb6b7e6e0d25" ON "chat_threads" ("academic_year_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_7a7d5d3da93a77b8b874f5c114" ON "chat_threads" ("teacher_user_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_4d55f86f517002e842d86ad1ef" ON "chat_threads" ("parent_user_id") `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_chat_threads_pair" ON "chat_threads" ("academic_year_id", "teacher_user_id", "parent_user_id", "student_id") WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE "chat_messages" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "school_id" integer NOT NULL, "thread_id" integer NOT NULL, "sender_user_id" integer NOT NULL, "sender_party" character varying(10) NOT NULL, "body" character varying(2000), "file_id" integer, "read_at" TIMESTAMP WITH TIME ZONE, "push_pending" boolean NOT NULL DEFAULT false, "push_after" TIMESTAMP WITH TIME ZONE, "flagged_at" TIMESTAMP WITH TIME ZONE, "flagged_by" integer, "flag_reason" character varying(255), "flag_resolved_at" TIMESTAMP WITH TIME ZONE, "hidden_at" TIMESTAMP WITH TIME ZONE, "hidden_by" integer, "hidden_reason" character varying(255), CONSTRAINT "PK_40c55ee0e571e268b0d3cd37d10" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_40dff827687a96842e20c2a092" ON "chat_messages" ("school_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_d6882f0373e6f52eb870f150aa" ON "chat_messages" ("push_pending") `);
    await queryRunner.query(`CREATE INDEX "IDX_chat_messages_thread_id" ON "chat_messages" ("thread_id", "id") `);
    await queryRunner.query(
      `CREATE TABLE "chat_audit_logs" ("id" SERIAL NOT NULL, "school_id" integer NOT NULL, "thread_id" integer NOT NULL, "message_id" integer, "actor_user_id" integer NOT NULL, "action" character varying(20) NOT NULL, "note" character varying(255), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_0c470a23666f12957300a4d0c53" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_15341ba0b35822e4d3d5a32330" ON "chat_audit_logs" ("school_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_7c3b440314fd6065bfa97d81da" ON "chat_audit_logs" ("thread_id") `);
    await queryRunner.query(
      `CREATE TABLE "announcements" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "created_by" integer, "school_id" integer NOT NULL, "academic_year_id" integer NOT NULL, "title" character varying(150) NOT NULL, "body" character varying(4000) NOT NULL, "audience" character varying(10) NOT NULL, "priority" character varying(10) NOT NULL DEFAULT 'normal', "status" character varying(10) NOT NULL DEFAULT 'draft', "publish_at" TIMESTAMP WITH TIME ZONE, "published_at" TIMESTAMP WITH TIME ZONE, "published_by" integer, "expires_at" TIMESTAMP WITH TIME ZONE, "archived_at" TIMESTAMP WITH TIME ZONE, "recipient_count" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_b3ad760876ff2e19d58e05dc8b0" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_029360939fa5617f73aaab39c7" ON "announcements" ("school_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_e19eeb6fccd9c88ca6dbff07d0" ON "announcements" ("academic_year_id") `);
    await queryRunner.query(
      `CREATE INDEX "IDX_announcements_school_year_status" ON "announcements" ("school_id", "academic_year_id", "status") `,
    );
    await queryRunner.query(
      `CREATE TABLE "announcement_targets" ("id" SERIAL NOT NULL, "announcement_id" integer NOT NULL, "class_id" integer, "section_id" integer, CONSTRAINT "PK_dc675d679d5429c4e50c3719f59" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_79a88ad59c561fe01d69262816" ON "announcement_targets" ("announcement_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "announcement_recipients" ("id" SERIAL NOT NULL, "announcement_id" integer NOT NULL, "user_id" integer NOT NULL, "segment" character varying(10) NOT NULL, "read_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_bf09a7b29d8c883c7ccfbb0d2be" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6c7a363f423b03cebec9ca4fdf" ON "announcement_recipients" ("announcement_id") `,
    );
    await queryRunner.query(`CREATE INDEX "IDX_090373e9e59d13b37969b9ceae" ON "announcement_recipients" ("user_id") `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_announcement_recipients_user" ON "announcement_recipients" ("announcement_id", "user_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "announcement_attachments" ("id" SERIAL NOT NULL, "announcement_id" integer NOT NULL, "file_id" integer NOT NULL, "sort_order" smallint NOT NULL DEFAULT '0', CONSTRAINT "PK_314f306a0c6de74f2003ad189d6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ccd50223fd0baa856092da9680" ON "announcement_attachments" ("announcement_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_announcement_attachments_file" ON "announcement_attachments" ("announcement_id", "file_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "schools" ADD "diary_review_mode" character varying(10) NOT NULL DEFAULT 'remarks'`,
    );
    await queryRunner.query(
      `ALTER TABLE "schools" ADD "chat_office_start" character varying(5) NOT NULL DEFAULT '08:00'`,
    );
    await queryRunner.query(
      `ALTER TABLE "schools" ADD "chat_office_end" character varying(5) NOT NULL DEFAULT '17:00'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "schools" DROP COLUMN "chat_office_end"`);
    await queryRunner.query(`ALTER TABLE "schools" DROP COLUMN "chat_office_start"`);
    await queryRunner.query(`ALTER TABLE "schools" DROP COLUMN "diary_review_mode"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_announcement_attachments_file"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ccd50223fd0baa856092da9680"`);
    await queryRunner.query(`DROP TABLE "announcement_attachments"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_announcement_recipients_user"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_090373e9e59d13b37969b9ceae"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_6c7a363f423b03cebec9ca4fdf"`);
    await queryRunner.query(`DROP TABLE "announcement_recipients"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_79a88ad59c561fe01d69262816"`);
    await queryRunner.query(`DROP TABLE "announcement_targets"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_announcements_school_year_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_e19eeb6fccd9c88ca6dbff07d0"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_029360939fa5617f73aaab39c7"`);
    await queryRunner.query(`DROP TABLE "announcements"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_7c3b440314fd6065bfa97d81da"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_15341ba0b35822e4d3d5a32330"`);
    await queryRunner.query(`DROP TABLE "chat_audit_logs"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_chat_messages_thread_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_d6882f0373e6f52eb870f150aa"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_40dff827687a96842e20c2a092"`);
    await queryRunner.query(`DROP TABLE "chat_messages"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_chat_threads_pair"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_4d55f86f517002e842d86ad1ef"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_7a7d5d3da93a77b8b874f5c114"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_a3efad25f3ca50cb6b7e6e0d25"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_b1824d8e6a24aaad88908c6822"`);
    await queryRunner.query(`DROP TABLE "chat_threads"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_diary_attachments_entry_file"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_b1b5c9224993f2d2ffa64e856c"`);
    await queryRunner.query(`DROP TABLE "diary_attachments"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_diary_recipients_entry_student"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_cdd9c3eff9976707ed73ff9a3a"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_614fec270d9749e1dd832dd660"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_2ddfeec0bf50e7868353577d48"`);
    await queryRunner.query(`DROP TABLE "diary_recipients"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_diary_entries_school_year_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_3f60043772170c26751aa61bdf"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_137ab1536b6e318054d57d7259"`);
    await queryRunner.query(`DROP TABLE "diary_entries"`);
  }
}
