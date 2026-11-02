import { MigrationInterface, QueryRunner } from 'typeorm';

export class StudentRecordsStaff1793621249457 implements MigrationInterface {
  name = 'StudentRecordsStaff1793621249457';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "student_vaccinations" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "created_by" integer, "school_id" integer NOT NULL, "student_id" integer NOT NULL, "vaccine" character varying(80) NOT NULL, "dose" character varying(30), "given_on" date, "due_on" date, "notes" character varying(255), CONSTRAINT "PK_b7d4592c7e703d77096e66e37dd" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_04831f29126adde56f557a3b2e" ON "student_vaccinations" ("school_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_93db159e4d69164b80337d16b0" ON "student_vaccinations" ("student_id") `);
    await queryRunner.query(
      `CREATE TABLE "student_health" ("id" SERIAL NOT NULL, "school_id" integer NOT NULL, "student_id" integer NOT NULL, "height_cm" numeric(5,1), "weight_kg" numeric(5,1), "allergies" character varying(255), "conditions" character varying(255), "medications" character varying(255), "vision" character varying(30), "doctor_name" character varying(120), "doctor_mobile" character varying(10), "notes" character varying(500), "last_checkup_on" date, "updated_by" integer, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_59b90afd7ef529c2431d48c0f59" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_a8df1508f6c414f4c4f91967c5" ON "student_health" ("school_id") `);
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_student_health_student" ON "student_health" ("student_id") `);
    await queryRunner.query(
      `CREATE TABLE "student_behaviour_notes" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "created_by" integer, "school_id" integer NOT NULL, "student_id" integer NOT NULL, "noted_on" date NOT NULL, "category" character varying(15) NOT NULL, "title" character varying(120) NOT NULL, "details" character varying(1000), "action_taken" character varying(255), "visible_to_parent" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_d6278de64b0c85b703e283ba5da" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a441b697ed737a8d3a6485206f" ON "student_behaviour_notes" ("school_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_aba74ec74b826fc2fd2b11c48f" ON "student_behaviour_notes" ("student_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "student_documents" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "created_by" integer, "school_id" integer NOT NULL, "type" character varying(30) NOT NULL, "title" character varying(120) NOT NULL, "file_id" integer NOT NULL, "status" character varying(10) NOT NULL DEFAULT 'pending', "remarks" character varying(255), "verified_by" integer, "verified_at" TIMESTAMP WITH TIME ZONE, "student_id" integer NOT NULL, "visible_to_parent" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_b5805e41001d410755048c8dfc4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_bb5d70352bbd80968b1b871531" ON "student_documents" ("school_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_8b0e086cbeca4ba69aadaac854" ON "student_documents" ("student_id") `);
    await queryRunner.query(
      `CREATE TABLE "teacher_assignments" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "created_by" integer, "school_id" integer NOT NULL, "academic_year_id" integer NOT NULL, "section_id" integer NOT NULL, "subject_id" integer NOT NULL, "teacher_user_id" integer NOT NULL, "periods_per_week" smallint NOT NULL DEFAULT '5', CONSTRAINT "PK_49fabd5cfe8fa2beb47a0b0fed9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_75d9e1d919dfed702a075aedb1" ON "teacher_assignments" ("school_id") `);
    await queryRunner.query(
      `CREATE INDEX "IDX_3d24e2e732d2e8d243e3c02206" ON "teacher_assignments" ("academic_year_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1deb9219c01b9e1e34536933a3" ON "teacher_assignments" ("teacher_user_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_teacher_assignments_section_subject" ON "teacher_assignments" ("section_id", "subject_id") WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE "transfer_certificates" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "created_by" integer, "school_id" integer NOT NULL, "student_id" integer NOT NULL, "tc_no" character varying(30) NOT NULL, "exit_type" character varying(12) NOT NULL, "leaving_date" date NOT NULL, "issued_on" date NOT NULL, "reason" character varying(255) NOT NULL, "conduct" character varying(40) NOT NULL DEFAULT 'Good', "academic_year_name" character varying(20), "class_name" character varying(30), "section_name" character varying(10), "promotion_eligible" boolean NOT NULL DEFAULT true, "remarks" character varying(255), CONSTRAINT "PK_6156618dc224b16d9a7d1013b84" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_2e713cc64e6b16031eb2411308" ON "transfer_certificates" ("school_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_bb9162e2848520ef1b33dbe919" ON "transfer_certificates" ("student_id") `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_transfer_certificates_school_no" ON "transfer_certificates" ("school_id", "tc_no") `,
    );
    await queryRunner.query(
      `CREATE TABLE "staff_documents" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "created_by" integer, "school_id" integer NOT NULL, "type" character varying(30) NOT NULL, "title" character varying(120) NOT NULL, "file_id" integer NOT NULL, "status" character varying(10) NOT NULL DEFAULT 'pending', "remarks" character varying(255), "verified_by" integer, "verified_at" TIMESTAMP WITH TIME ZONE, "staff_id" integer NOT NULL, CONSTRAINT "PK_839ead62045ac25f73271e6823d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_b00a32c613e0a4409ed0357ebc" ON "staff_documents" ("school_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_49e9bc3067a238abd033e69c0a" ON "staff_documents" ("staff_id") `);
    await queryRunner.query(
      `CREATE TABLE "staff_qualifications" ("id" SERIAL NOT NULL, "staff_id" integer NOT NULL, "degree" character varying(60) NOT NULL, "specialization" character varying(80), "institution" character varying(150), "year_completed" smallint, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_4153cd5072cdcf40b797a291516" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_989a32d764fd9d577fd09c0fee" ON "staff_qualifications" ("staff_id") `);
    await queryRunner.query(
      `CREATE TABLE "staff" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "created_by" integer, "school_id" integer NOT NULL, "user_id" integer NOT NULL, "employee_no" character varying(30) NOT NULL, "staff_type" character varying(15) NOT NULL DEFAULT 'teaching', "designation" character varying(80) NOT NULL, "department" character varying(60), "gender" character varying(10), "dob" date, "joining_date" date NOT NULL, "prior_experience_years" smallint NOT NULL DEFAULT '0', "max_periods_per_week" smallint NOT NULL DEFAULT '30', "address" character varying(255), "emergency_contact_name" character varying(120), "emergency_contact_mobile" character varying(10), "status" character varying(10) NOT NULL DEFAULT 'active', "left_on" date, "bank_account_holder" character varying(120), "bank_name" character varying(80), "bank_ifsc" character varying(11), "bank_account_enc" text, "bank_account_last4" character varying(4), "pan_enc" text, "pan_last4" character varying(4), CONSTRAINT "PK_e4ee98bb552756c180aec1e854a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_351341ffb6055ef0907b18e28b" ON "staff" ("school_id") `);
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_staff_user" ON "staff" ("user_id") WHERE deleted_at IS NULL`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_staff_school_employee_no" ON "staff" ("school_id", "employee_no") WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(`ALTER TABLE "students" ADD "card_version" smallint NOT NULL DEFAULT '1'`);
    await queryRunner.query(`ALTER TABLE "students" ADD "left_on" date`);
    await queryRunner.query(
      `ALTER TABLE "teacher_assignments" ADD CONSTRAINT "FK_f8d44263ea9667675742a5913bc" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "teacher_assignments" ADD CONSTRAINT "FK_05177d586094d252e606df5025f" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "teacher_assignments" ADD CONSTRAINT "FK_1deb9219c01b9e1e34536933a35" FOREIGN KEY ("teacher_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "staff_documents" ADD CONSTRAINT "FK_49e9bc3067a238abd033e69c0a8" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "staff_qualifications" ADD CONSTRAINT "FK_989a32d764fd9d577fd09c0fee2" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "staff" ADD CONSTRAINT "FK_cec9365d9fc3a3409158b645f2e" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "staff" DROP CONSTRAINT "FK_cec9365d9fc3a3409158b645f2e"`);
    await queryRunner.query(`ALTER TABLE "staff_qualifications" DROP CONSTRAINT "FK_989a32d764fd9d577fd09c0fee2"`);
    await queryRunner.query(`ALTER TABLE "staff_documents" DROP CONSTRAINT "FK_49e9bc3067a238abd033e69c0a8"`);
    await queryRunner.query(`ALTER TABLE "teacher_assignments" DROP CONSTRAINT "FK_1deb9219c01b9e1e34536933a35"`);
    await queryRunner.query(`ALTER TABLE "teacher_assignments" DROP CONSTRAINT "FK_05177d586094d252e606df5025f"`);
    await queryRunner.query(`ALTER TABLE "teacher_assignments" DROP CONSTRAINT "FK_f8d44263ea9667675742a5913bc"`);
    await queryRunner.query(`ALTER TABLE "students" DROP COLUMN "left_on"`);
    await queryRunner.query(`ALTER TABLE "students" DROP COLUMN "card_version"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_staff_school_employee_no"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_staff_user"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_351341ffb6055ef0907b18e28b"`);
    await queryRunner.query(`DROP TABLE "staff"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_989a32d764fd9d577fd09c0fee"`);
    await queryRunner.query(`DROP TABLE "staff_qualifications"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_49e9bc3067a238abd033e69c0a"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_b00a32c613e0a4409ed0357ebc"`);
    await queryRunner.query(`DROP TABLE "staff_documents"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_transfer_certificates_school_no"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_bb9162e2848520ef1b33dbe919"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_2e713cc64e6b16031eb2411308"`);
    await queryRunner.query(`DROP TABLE "transfer_certificates"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_teacher_assignments_section_subject"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_1deb9219c01b9e1e34536933a3"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_3d24e2e732d2e8d243e3c02206"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_75d9e1d919dfed702a075aedb1"`);
    await queryRunner.query(`DROP TABLE "teacher_assignments"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_8b0e086cbeca4ba69aadaac854"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_bb5d70352bbd80968b1b871531"`);
    await queryRunner.query(`DROP TABLE "student_documents"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_aba74ec74b826fc2fd2b11c48f"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_a441b697ed737a8d3a6485206f"`);
    await queryRunner.query(`DROP TABLE "student_behaviour_notes"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_student_health_student"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_a8df1508f6c414f4c4f91967c5"`);
    await queryRunner.query(`DROP TABLE "student_health"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_93db159e4d69164b80337d16b0"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_04831f29126adde56f557a3b2e"`);
    await queryRunner.query(`DROP TABLE "student_vaccinations"`);
  }
}
