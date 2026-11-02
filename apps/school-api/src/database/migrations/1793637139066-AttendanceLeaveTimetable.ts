import { MigrationInterface, QueryRunner } from 'typeorm';

export class AttendanceLeaveTimetable1793637139066 implements MigrationInterface {
  name = 'AttendanceLeaveTimetable1793637139066';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "timetable_slots" ("id" SERIAL NOT NULL, "school_id" integer NOT NULL, "academic_year_id" integer NOT NULL, "section_id" integer NOT NULL, "day_of_week" smallint NOT NULL, "period_no" smallint NOT NULL, "subject_id" integer NOT NULL, "teacher_user_id" integer, "room" character varying(20), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_b2253a56b9d36d00f84aff7efcc" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_173fac1c846b3efb3fdb4dbdaa" ON "timetable_slots" ("school_id") `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_timetable_room_slot" ON "timetable_slots" ("school_id", "academic_year_id", "day_of_week", "period_no", "room") WHERE room IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_timetable_teacher_slot" ON "timetable_slots" ("academic_year_id", "day_of_week", "period_no", "teacher_user_id") WHERE teacher_user_id IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_timetable_section_slot" ON "timetable_slots" ("section_id", "day_of_week", "period_no") `,
    );
    await queryRunner.query(
      `CREATE TABLE "bell_periods" ("id" SERIAL NOT NULL, "school_id" integer NOT NULL, "period_no" smallint, "name" character varying(30) NOT NULL, "start_time" character varying(5) NOT NULL, "end_time" character varying(5) NOT NULL, "is_break" boolean NOT NULL DEFAULT false, "sort_order" smallint NOT NULL DEFAULT '0', CONSTRAINT "PK_5beb58b385673ee9e4a4eb4159c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_2779a5a415470ea6ed066ef1dd" ON "bell_periods" ("school_id") `);
    await queryRunner.query(
      `CREATE TABLE "leave_types" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "created_by" integer, "school_id" integer NOT NULL, "code" character varying(10) NOT NULL, "name" character varying(60) NOT NULL, "days_per_year" smallint NOT NULL DEFAULT '0', "is_paid" boolean NOT NULL DEFAULT true, "is_active" boolean NOT NULL DEFAULT true, "sort_order" smallint NOT NULL DEFAULT '0', CONSTRAINT "PK_359223e0755d19711813cd07394" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_1f3cc81275258be8878f90c662" ON "leave_types" ("school_id") `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_leave_types_school_code" ON "leave_types" ("school_id", "code") WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE "staff_leave_requests" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "created_by" integer, "school_id" integer NOT NULL, "user_id" integer NOT NULL, "leave_type_id" integer NOT NULL, "academic_year_id" integer NOT NULL, "from_date" date NOT NULL, "to_date" date NOT NULL, "half_day" boolean NOT NULL DEFAULT false, "days" numeric(4,1) NOT NULL, "reason" character varying(500) NOT NULL, "status" character varying(20) NOT NULL, "hod_user_id" integer, "hod_decided_at" TIMESTAMP WITH TIME ZONE, "hod_note" character varying(255), "principal_user_id" integer, "principal_decided_at" TIMESTAMP WITH TIME ZONE, "principal_note" character varying(255), CONSTRAINT "PK_066c3ab8534c6675f094d717d2f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_d314c7d35d485d4e5d5c37c29c" ON "staff_leave_requests" ("school_id") `);
    await queryRunner.query(
      `CREATE INDEX "IDX_staff_leave_user_dates" ON "staff_leave_requests" ("user_id", "from_date") `,
    );
    await queryRunner.query(
      `CREATE TABLE "staff_attendance" ("id" SERIAL NOT NULL, "school_id" integer NOT NULL, "user_id" integer NOT NULL, "date" date NOT NULL, "check_in_at" TIMESTAMP WITH TIME ZONE, "check_out_at" TIMESTAMP WITH TIME ZONE, "check_in_lat" double precision, "check_in_lng" double precision, "check_in_distance_m" integer, "check_out_distance_m" integer, "source" character varying(10) NOT NULL DEFAULT 'app', "status" character varying(10) NOT NULL DEFAULT 'present', "remarks" character varying(255), "marked_by" integer, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_b76740885e2e06ab5e81ccd7781" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_528807b78cbab630d7c24c2361" ON "staff_attendance" ("school_id") `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_staff_attendance_user_date" ON "staff_attendance" ("user_id", "date") `,
    );
    await queryRunner.query(
      `CREATE TABLE "student_leave_requests" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "created_by" integer, "school_id" integer NOT NULL, "student_id" integer NOT NULL, "from_date" date NOT NULL, "to_date" date NOT NULL, "reason" character varying(500) NOT NULL, "file_id" integer, "status" character varying(10) NOT NULL DEFAULT 'pending', "decided_by" integer, "decided_at" TIMESTAMP WITH TIME ZONE, "decision_note" character varying(255), CONSTRAINT "PK_1c07e39e90d86593116f0138c81" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_67d547f7399fd08ca366502188" ON "student_leave_requests" ("school_id") `);
    await queryRunner.query(
      `CREATE INDEX "IDX_372706db60634efa4ca0c4737e" ON "student_leave_requests" ("student_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "attendance_records" ("id" SERIAL NOT NULL, "session_id" integer NOT NULL, "school_id" integer NOT NULL, "student_id" integer NOT NULL, "date" date NOT NULL, "period" smallint NOT NULL DEFAULT '0', "status" character varying(10) NOT NULL, "remarks" character varying(255), "alert_sent" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_946920332f5bc9efad3f3023b96" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_5ade718880c9f245516bc1014a" ON "attendance_records" ("school_id") `);
    await queryRunner.query(
      `CREATE INDEX "IDX_attendance_records_student_date" ON "attendance_records" ("student_id", "date") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_attendance_records_session_student" ON "attendance_records" ("session_id", "student_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "attendance_sessions" ("id" SERIAL NOT NULL, "school_id" integer NOT NULL, "academic_year_id" integer NOT NULL, "section_id" integer NOT NULL, "date" date NOT NULL, "period" smallint NOT NULL DEFAULT '0', "subject_id" integer, "taken_by" integer, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_84d565d9e484e2bcdaf4a9e1890" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_d08083dfbf6ed58428b3bf68a0" ON "attendance_sessions" ("school_id") `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_attendance_sessions_section_date_period" ON "attendance_sessions" ("section_id", "date", "period") `,
    );
    await queryRunner.query(
      `ALTER TABLE "schools" ADD "staff_reporting_time" character varying(5) NOT NULL DEFAULT '08:45'`,
    );
    await queryRunner.query(
      `ALTER TABLE "staff_leave_requests" ADD CONSTRAINT "FK_6a8efe6b8e64e4f07789bac343a" FOREIGN KEY ("leave_type_id") REFERENCES "leave_types"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "attendance_records" ADD CONSTRAINT "FK_c51be2c1149e22de76b17626cb7" FOREIGN KEY ("session_id") REFERENCES "attendance_sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "attendance_records" DROP CONSTRAINT "FK_c51be2c1149e22de76b17626cb7"`);
    await queryRunner.query(`ALTER TABLE "staff_leave_requests" DROP CONSTRAINT "FK_6a8efe6b8e64e4f07789bac343a"`);
    await queryRunner.query(`ALTER TABLE "schools" DROP COLUMN "staff_reporting_time"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_attendance_sessions_section_date_period"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_d08083dfbf6ed58428b3bf68a0"`);
    await queryRunner.query(`DROP TABLE "attendance_sessions"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_attendance_records_session_student"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_attendance_records_student_date"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_5ade718880c9f245516bc1014a"`);
    await queryRunner.query(`DROP TABLE "attendance_records"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_372706db60634efa4ca0c4737e"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_67d547f7399fd08ca366502188"`);
    await queryRunner.query(`DROP TABLE "student_leave_requests"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_staff_attendance_user_date"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_528807b78cbab630d7c24c2361"`);
    await queryRunner.query(`DROP TABLE "staff_attendance"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_staff_leave_user_dates"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_d314c7d35d485d4e5d5c37c29c"`);
    await queryRunner.query(`DROP TABLE "staff_leave_requests"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_leave_types_school_code"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_1f3cc81275258be8878f90c662"`);
    await queryRunner.query(`DROP TABLE "leave_types"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_2779a5a415470ea6ed066ef1dd"`);
    await queryRunner.query(`DROP TABLE "bell_periods"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_timetable_section_slot"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_timetable_teacher_slot"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_timetable_room_slot"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_173fac1c846b3efb3fdb4dbdaa"`);
    await queryRunner.query(`DROP TABLE "timetable_slots"`);
  }
}
