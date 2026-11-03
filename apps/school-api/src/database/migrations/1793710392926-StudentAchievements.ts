import { MigrationInterface, QueryRunner } from 'typeorm';

export class StudentAchievements1793710392926 implements MigrationInterface {
  name = 'StudentAchievements1793710392926';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "student_achievements" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "created_by" integer, "school_id" integer NOT NULL, "student_id" integer NOT NULL, "title" character varying(120) NOT NULL, "category" character varying(15) NOT NULL, "level" character varying(15) NOT NULL DEFAULT 'school', "position" character varying(30), "achieved_on" date NOT NULL, "description" character varying(500), "file_id" integer, "visible_to_parent" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_ed9a48f1a85af58bf62d57b48e4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_a43d81c3b8fe624aa0a8e5a001" ON "student_achievements" ("school_id") `);
    await queryRunner.query(
      `CREATE INDEX "IDX_student_achievements_student_date" ON "student_achievements" ("student_id", "achieved_on") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_student_achievements_student_date"`);
    await queryRunner.query(`DROP TABLE "student_achievements"`);
  }
}
