import { MigrationInterface, QueryRunner } from 'typeorm';

export class SchoolSetupStudents1793615180471 implements MigrationInterface {
  name = 'SchoolSetupStudents1793615180471';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "emergency_contacts" ("id" SERIAL NOT NULL, "student_id" integer NOT NULL, "name" character varying(120) NOT NULL, "relation" character varying(40) NOT NULL, "mobile" character varying(10) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_8be191845b6fca1c4e5ba5bd7d1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_f12b6969989d6092bd7c20a988" ON "emergency_contacts" ("student_id") `);
    await queryRunner.query(
      `CREATE TABLE "terms" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "created_by" integer, "school_id" integer NOT NULL, "academic_year_id" integer NOT NULL, "name" character varying(40) NOT NULL, "start_date" date NOT NULL, "end_date" date NOT NULL, "sort_order" smallint NOT NULL DEFAULT '0', CONSTRAINT "PK_33b6fe77d6ace7ff43cc8a65958" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_6bd7b697c214e218152e5a9427" ON "terms" ("school_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_733590da28e000d72a406ff95a" ON "terms" ("academic_year_id") `);
    await queryRunner.query(
      `CREATE TABLE "academic_years" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "created_by" integer, "school_id" integer NOT NULL, "name" character varying(20) NOT NULL, "start_date" date NOT NULL, "end_date" date NOT NULL, "is_current" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_2021b90bfbfa6c9da7df34ca1cf" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_b293eb7909d2a3aae86c438071" ON "academic_years" ("school_id") `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_academic_years_school_current" ON "academic_years" ("school_id") WHERE is_current = true AND deleted_at IS NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_academic_years_school_name" ON "academic_years" ("school_id", "name") WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE "sections" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "created_by" integer, "school_id" integer NOT NULL, "class_id" integer NOT NULL, "academic_year_id" integer NOT NULL, "name" character varying(10) NOT NULL, "class_teacher_user_id" integer, "room" character varying(30), "capacity" smallint NOT NULL DEFAULT '40', CONSTRAINT "PK_f9749dd3bffd880a497d007e450" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_ff9259b86078bdc799eab2ee8e" ON "sections" ("school_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_27db91d7369af6f181412afa99" ON "sections" ("class_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_a5d59ef3ae67c92d72f2164ac8" ON "sections" ("academic_year_id") `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_sections_class_year_name" ON "sections" ("class_id", "academic_year_id", "name") WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE "classes" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "created_by" integer, "school_id" integer NOT NULL, "name" character varying(30) NOT NULL, "grade_level" smallint NOT NULL, CONSTRAINT "PK_e207aa15404e9b2ce35910f9f7f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_398f3990f5da4a1efda173f576" ON "classes" ("school_id") `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_classes_school_name" ON "classes" ("school_id", "name") WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE "student_enrollments" ("id" SERIAL NOT NULL, "school_id" integer NOT NULL, "student_id" integer NOT NULL, "academic_year_id" integer NOT NULL, "class_id" integer NOT NULL, "section_id" integer, "roll_no" smallint, "status" character varying(10) NOT NULL DEFAULT 'studying', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_65f64fb270d4575b099b16e00a2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_6969e646aa55906ab338683340" ON "student_enrollments" ("school_id") `);
    await queryRunner.query(
      `CREATE INDEX "IDX_d0d2229aea2c212e21bc66628a" ON "student_enrollments" ("academic_year_id") `,
    );
    await queryRunner.query(`CREATE INDEX "IDX_e875df488b1b297f25e3dff303" ON "student_enrollments" ("class_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_a504e03e002336b6bf7f17d621" ON "student_enrollments" ("section_id") `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_student_enrollments_section_roll" ON "student_enrollments" ("section_id", "roll_no") WHERE roll_no IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_student_enrollments_student_year" ON "student_enrollments" ("student_id", "academic_year_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "guardians" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "created_by" integer, "school_id" integer NOT NULL, "name" character varying(120) NOT NULL, "mobile" character varying(10) NOT NULL, "alt_mobile" character varying(10), "email" character varying(150), "occupation" character varying(80), "qualification" character varying(80), "address_line" character varying(255), "city" character varying(80), "pincode" character varying(10), "photo_file_id" integer, "user_id" integer, CONSTRAINT "PK_3dcf02f3dc96a2c017106f280be" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_f7e300b647548abd1f0ae128ca" ON "guardians" ("school_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_f1d05a3a2d70db0a25479b6718" ON "guardians" ("user_id") `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_guardians_school_mobile" ON "guardians" ("school_id", "mobile") WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE "student_guardians" ("id" SERIAL NOT NULL, "school_id" integer NOT NULL, "student_id" integer NOT NULL, "guardian_id" integer NOT NULL, "relation" character varying(12) NOT NULL, "is_primary" boolean NOT NULL DEFAULT false, "can_pickup" boolean NOT NULL DEFAULT true, "receives_alerts" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_11ef78f5131711d8da1b14e3332" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_160bf4c447a9c01ef589e50263" ON "student_guardians" ("school_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_ec3cd56a2093be19f778af57c6" ON "student_guardians" ("guardian_id") `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_student_guardians_student_guardian" ON "student_guardians" ("student_id", "guardian_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "students" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "created_by" integer, "school_id" integer NOT NULL, "admission_no" character varying(30) NOT NULL, "first_name" character varying(60) NOT NULL, "last_name" character varying(60), "dob" date NOT NULL, "gender" character varying(10) NOT NULL, "blood_group" character varying(3), "photo_file_id" integer, "house" character varying(20), "admission_date" date NOT NULL, "status" character varying(12) NOT NULL DEFAULT 'active', "address_line" character varying(255), "city" character varying(80), "pincode" character varying(10), "previous_school" character varying(150), CONSTRAINT "PK_7d7f07271ad4ce999880713f05e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_aa8edc7905ad764f8592456964" ON "students" ("school_id") `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_students_school_admission_no" ON "students" ("school_id", "admission_no") WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE "admissions" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "created_by" integer, "school_id" integer NOT NULL, "application_no" character varying(30) NOT NULL, "academic_year_id" integer NOT NULL, "class_id" integer NOT NULL, "first_name" character varying(60) NOT NULL, "last_name" character varying(60), "dob" date NOT NULL, "gender" character varying(10) NOT NULL, "guardian_name" character varying(120) NOT NULL, "guardian_mobile" character varying(10) NOT NULL, "guardian_relation" character varying(12) NOT NULL, "guardian_email" character varying(150), "previous_school" character varying(150), "notes" text, "status" character varying(10) NOT NULL DEFAULT 'applied', "decision_note" text, "decided_by" integer, "decided_at" TIMESTAMP WITH TIME ZONE, "student_id" integer, CONSTRAINT "PK_6d47682a899dfa0a78ce11fe98a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_a83c20b80aedc4923eab82c8ee" ON "admissions" ("school_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_admissions_school_status" ON "admissions" ("school_id", "status") `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_admissions_school_application_no" ON "admissions" ("school_id", "application_no") WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE "subjects" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "created_by" integer, "school_id" integer NOT NULL, "code" character varying(20) NOT NULL, "name" character varying(80) NOT NULL, "type" character varying(12) NOT NULL DEFAULT 'theory', CONSTRAINT "PK_1a023685ac2b051b4e557b0b280" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_07a82eb883094a6990b914cc15" ON "subjects" ("school_id") `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_subjects_school_code" ON "subjects" ("school_id", "code") WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE "holidays" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "created_by" integer, "school_id" integer NOT NULL, "date" date NOT NULL, "end_date" date, "name" character varying(120) NOT NULL, "type" character varying(20) NOT NULL DEFAULT 'holiday', CONSTRAINT "PK_3646bdd4c3817d954d830881dfe" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_656466c53133f84535ede6fafb" ON "holidays" ("school_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_holidays_school_date" ON "holidays" ("school_id", "date") `);
    await queryRunner.query(
      `CREATE TABLE "class_subjects" ("id" SERIAL NOT NULL, "school_id" integer NOT NULL, "class_id" integer NOT NULL, "subject_id" integer NOT NULL, "academic_year_id" integer NOT NULL, "periods_per_week" smallint NOT NULL DEFAULT '0', "is_optional" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_4e1ecabd8771166a29291dc09ed" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_39a598aeb6ece0be771e5ecb8c" ON "class_subjects" ("school_id") `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_class_subjects_class_subject_year" ON "class_subjects" ("class_id", "subject_id", "academic_year_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "number_sequences" ("id" SERIAL NOT NULL, "school_id" integer NOT NULL, "key" character varying(40) NOT NULL, "value" integer NOT NULL DEFAULT '0', "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_d4783b8bab8c10a0ccbdfaaef34" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_number_sequences_school_key" ON "number_sequences" ("school_id", "key") `,
    );
    await queryRunner.query(
      `ALTER TABLE "emergency_contacts" ADD CONSTRAINT "FK_f12b6969989d6092bd7c20a9884" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "terms" ADD CONSTRAINT "FK_733590da28e000d72a406ff95a9" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sections" ADD CONSTRAINT "FK_27db91d7369af6f181412afa99f" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sections" ADD CONSTRAINT "FK_a5d59ef3ae67c92d72f2164ac82" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sections" ADD CONSTRAINT "FK_a61ce7ba16220f5613709d806c7" FOREIGN KEY ("class_teacher_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_enrollments" ADD CONSTRAINT "FK_08caafd8a026a19ecf54db0e958" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_enrollments" ADD CONSTRAINT "FK_d0d2229aea2c212e21bc66628a0" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_enrollments" ADD CONSTRAINT "FK_e875df488b1b297f25e3dff3039" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_enrollments" ADD CONSTRAINT "FK_a504e03e002336b6bf7f17d6212" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "guardians" ADD CONSTRAINT "FK_f1d05a3a2d70db0a25479b67189" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_guardians" ADD CONSTRAINT "FK_8194052bdd62204f061dd44e0c9" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_guardians" ADD CONSTRAINT "FK_ec3cd56a2093be19f778af57c63" FOREIGN KEY ("guardian_id") REFERENCES "guardians"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "admissions" ADD CONSTRAINT "FK_f28ffa88471f9e9e86efdf9be08" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "admissions" ADD CONSTRAINT "FK_40b50c2c38b1edf2820295d5a8e" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "admissions" ADD CONSTRAINT "FK_7d958e4a9d315b162159854b87e" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "class_subjects" ADD CONSTRAINT "FK_433f93dd22b685e59c285726a1f" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "class_subjects" ADD CONSTRAINT "FK_9d8971acdcc64a1703357a00759" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "class_subjects" ADD CONSTRAINT "FK_f4622ca4b5c253658c080a2a59c" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "class_subjects" DROP CONSTRAINT "FK_f4622ca4b5c253658c080a2a59c"`);
    await queryRunner.query(`ALTER TABLE "class_subjects" DROP CONSTRAINT "FK_9d8971acdcc64a1703357a00759"`);
    await queryRunner.query(`ALTER TABLE "class_subjects" DROP CONSTRAINT "FK_433f93dd22b685e59c285726a1f"`);
    await queryRunner.query(`ALTER TABLE "admissions" DROP CONSTRAINT "FK_7d958e4a9d315b162159854b87e"`);
    await queryRunner.query(`ALTER TABLE "admissions" DROP CONSTRAINT "FK_40b50c2c38b1edf2820295d5a8e"`);
    await queryRunner.query(`ALTER TABLE "admissions" DROP CONSTRAINT "FK_f28ffa88471f9e9e86efdf9be08"`);
    await queryRunner.query(`ALTER TABLE "student_guardians" DROP CONSTRAINT "FK_ec3cd56a2093be19f778af57c63"`);
    await queryRunner.query(`ALTER TABLE "student_guardians" DROP CONSTRAINT "FK_8194052bdd62204f061dd44e0c9"`);
    await queryRunner.query(`ALTER TABLE "guardians" DROP CONSTRAINT "FK_f1d05a3a2d70db0a25479b67189"`);
    await queryRunner.query(`ALTER TABLE "student_enrollments" DROP CONSTRAINT "FK_a504e03e002336b6bf7f17d6212"`);
    await queryRunner.query(`ALTER TABLE "student_enrollments" DROP CONSTRAINT "FK_e875df488b1b297f25e3dff3039"`);
    await queryRunner.query(`ALTER TABLE "student_enrollments" DROP CONSTRAINT "FK_d0d2229aea2c212e21bc66628a0"`);
    await queryRunner.query(`ALTER TABLE "student_enrollments" DROP CONSTRAINT "FK_08caafd8a026a19ecf54db0e958"`);
    await queryRunner.query(`ALTER TABLE "sections" DROP CONSTRAINT "FK_a61ce7ba16220f5613709d806c7"`);
    await queryRunner.query(`ALTER TABLE "sections" DROP CONSTRAINT "FK_a5d59ef3ae67c92d72f2164ac82"`);
    await queryRunner.query(`ALTER TABLE "sections" DROP CONSTRAINT "FK_27db91d7369af6f181412afa99f"`);
    await queryRunner.query(`ALTER TABLE "terms" DROP CONSTRAINT "FK_733590da28e000d72a406ff95a9"`);
    await queryRunner.query(`ALTER TABLE "emergency_contacts" DROP CONSTRAINT "FK_f12b6969989d6092bd7c20a9884"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_number_sequences_school_key"`);
    await queryRunner.query(`DROP TABLE "number_sequences"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_class_subjects_class_subject_year"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_39a598aeb6ece0be771e5ecb8c"`);
    await queryRunner.query(`DROP TABLE "class_subjects"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_holidays_school_date"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_656466c53133f84535ede6fafb"`);
    await queryRunner.query(`DROP TABLE "holidays"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_subjects_school_code"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_07a82eb883094a6990b914cc15"`);
    await queryRunner.query(`DROP TABLE "subjects"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_admissions_school_application_no"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_admissions_school_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_a83c20b80aedc4923eab82c8ee"`);
    await queryRunner.query(`DROP TABLE "admissions"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_students_school_admission_no"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_aa8edc7905ad764f8592456964"`);
    await queryRunner.query(`DROP TABLE "students"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_student_guardians_student_guardian"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ec3cd56a2093be19f778af57c6"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_160bf4c447a9c01ef589e50263"`);
    await queryRunner.query(`DROP TABLE "student_guardians"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_guardians_school_mobile"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_f1d05a3a2d70db0a25479b6718"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_f7e300b647548abd1f0ae128ca"`);
    await queryRunner.query(`DROP TABLE "guardians"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_student_enrollments_student_year"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_student_enrollments_section_roll"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_a504e03e002336b6bf7f17d621"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_e875df488b1b297f25e3dff303"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_d0d2229aea2c212e21bc66628a"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_6969e646aa55906ab338683340"`);
    await queryRunner.query(`DROP TABLE "student_enrollments"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_classes_school_name"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_398f3990f5da4a1efda173f576"`);
    await queryRunner.query(`DROP TABLE "classes"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_sections_class_year_name"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_a5d59ef3ae67c92d72f2164ac8"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_27db91d7369af6f181412afa99"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ff9259b86078bdc799eab2ee8e"`);
    await queryRunner.query(`DROP TABLE "sections"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_academic_years_school_name"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_academic_years_school_current"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_b293eb7909d2a3aae86c438071"`);
    await queryRunner.query(`DROP TABLE "academic_years"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_733590da28e000d72a406ff95a"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_6bd7b697c214e218152e5a9427"`);
    await queryRunner.query(`DROP TABLE "terms"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_f12b6969989d6092bd7c20a988"`);
    await queryRunner.query(`DROP TABLE "emergency_contacts"`);
  }
}
