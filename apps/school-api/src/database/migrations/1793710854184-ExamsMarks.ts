import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExamsMarks1793710854184 implements MigrationInterface {
  name = 'ExamsMarks1793710854184';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "exams" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "created_by" integer, "school_id" integer NOT NULL, "academic_year_id" integer NOT NULL, "term_id" integer, "name" character varying(80) NOT NULL, "start_date" date NOT NULL, "end_date" date NOT NULL, "status" character varying(10) NOT NULL DEFAULT 'draft', "published_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_b43159ee3efa440952794b4f53e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_990f1559338541918a5a10d5cc" ON "exams" ("school_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_b97467bb97e3b5afc87bca8e18" ON "exams" ("academic_year_id") `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_exams_year_name" ON "exams" ("school_id", "academic_year_id", "name") WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE "exam_subjects" ("id" SERIAL NOT NULL, "school_id" integer NOT NULL, "exam_id" integer NOT NULL, "class_id" integer NOT NULL, "subject_id" integer NOT NULL, "max_marks" smallint NOT NULL DEFAULT '100', "pass_marks" smallint NOT NULL DEFAULT '35', "exam_date" date, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_3ea5999cbf489c3435c48690b45" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_8054b4ecc68a53ec677f4c4b14" ON "exam_subjects" ("school_id") `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_exam_subjects_exam_class_subject" ON "exam_subjects" ("exam_id", "class_id", "subject_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "exam_marks" ("id" SERIAL NOT NULL, "school_id" integer NOT NULL, "exam_id" integer NOT NULL, "student_id" integer NOT NULL, "subject_id" integer NOT NULL, "marks" numeric(5,2), "is_absent" boolean NOT NULL DEFAULT false, "entered_by" integer, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_5fe7a30b91652e8af8e256d0bbd" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_7c767e89da1ed33902d8207771" ON "exam_marks" ("school_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_245492ba0f329e8bee51eac1c9" ON "exam_marks" ("student_id") `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_exam_marks_exam_student_subject" ON "exam_marks" ("exam_id", "student_id", "subject_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "exams" ADD CONSTRAINT "FK_b97467bb97e3b5afc87bca8e18b" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "exams" ADD CONSTRAINT "FK_a09e73ec2b5b6628ae05af5bedb" FOREIGN KEY ("term_id") REFERENCES "terms"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "exam_subjects" ADD CONSTRAINT "FK_3890e28948d637c64735bdbf777" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "exam_subjects" ADD CONSTRAINT "FK_e651589a919d5f9108d837cdadd" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "exam_subjects" ADD CONSTRAINT "FK_69f32695b991bc2466aa511048a" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "exam_marks" ADD CONSTRAINT "FK_971b33b6a82f1e23f4530e81877" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "exam_marks" ADD CONSTRAINT "FK_245492ba0f329e8bee51eac1c93" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "exam_marks" ADD CONSTRAINT "FK_6ed81eee7048157ce56e6ff2210" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "exam_marks" ADD CONSTRAINT "FK_44e04b6caeb9be5b5a4d50af65d" FOREIGN KEY ("entered_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "exam_marks" DROP CONSTRAINT "FK_44e04b6caeb9be5b5a4d50af65d"`);
    await queryRunner.query(`ALTER TABLE "exam_marks" DROP CONSTRAINT "FK_6ed81eee7048157ce56e6ff2210"`);
    await queryRunner.query(`ALTER TABLE "exam_marks" DROP CONSTRAINT "FK_245492ba0f329e8bee51eac1c93"`);
    await queryRunner.query(`ALTER TABLE "exam_marks" DROP CONSTRAINT "FK_971b33b6a82f1e23f4530e81877"`);
    await queryRunner.query(`ALTER TABLE "exam_subjects" DROP CONSTRAINT "FK_69f32695b991bc2466aa511048a"`);
    await queryRunner.query(`ALTER TABLE "exam_subjects" DROP CONSTRAINT "FK_e651589a919d5f9108d837cdadd"`);
    await queryRunner.query(`ALTER TABLE "exam_subjects" DROP CONSTRAINT "FK_3890e28948d637c64735bdbf777"`);
    await queryRunner.query(`ALTER TABLE "exams" DROP CONSTRAINT "FK_a09e73ec2b5b6628ae05af5bedb"`);
    await queryRunner.query(`ALTER TABLE "exams" DROP CONSTRAINT "FK_b97467bb97e3b5afc87bca8e18b"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_exam_marks_exam_student_subject"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_245492ba0f329e8bee51eac1c9"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_7c767e89da1ed33902d8207771"`);
    await queryRunner.query(`DROP TABLE "exam_marks"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_exam_subjects_exam_class_subject"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_8054b4ecc68a53ec677f4c4b14"`);
    await queryRunner.query(`DROP TABLE "exam_subjects"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_exams_year_name"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_b97467bb97e3b5afc87bca8e18"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_990f1559338541918a5a10d5cc"`);
    await queryRunner.query(`DROP TABLE "exams"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_b6727f00fab7d7c3fcc26b056d"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_050e8b0d669f7d04db39c6b61b"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_88c9231b6c96b5aab59f29921b"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_9a5200170c614277923bc78d0a"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_bca9f5347417021b0d5dd2b765"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_14b956ec2d4d139dcf692cf116"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_31ddc60f24bde64b484c0ce091"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_642401d8b025edcdd38eea9387"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_20cff38d2b8f74675f5581e3c0"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_bd84733aa2b70daf7e82bc86b1"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_e307a0e8f247a2d4fb804e51f1"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_95be930f1a87918852588fa4ad"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_da875354837748c4fca1cc21af"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_b8218a2d2103103ba53f73371c"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_79e5f5ddb20bfb37f4dab4e187"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_c5c6e8c83553bb8b37b50a4eb0"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_e50f9773df877e7e02d7b0a671"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_944392bc0bb7a53e1d04f300dc"`);
  }
}
