import { MigrationInterface, QueryRunner } from 'typeorm';

export class CombineClass1793724217928 implements MigrationInterface {
  name = 'CombineClass1793724217928';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "substitution_merges" ("id" SERIAL NOT NULL, "substitution_id" integer NOT NULL, "school_id" integer NOT NULL, "target_section_id" integer NOT NULL, "target_slot_id" integer NOT NULL, "target_teacher_user_id" integer, "student_group" character varying(10) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_7c7419477e842fe57c338265895" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6d5587b8d8d26124825b4b44d4" ON "substitution_merges" ("substitution_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_substitution_merges_target" ON "substitution_merges" ("target_slot_id") `,
    );
    await queryRunner.query(`ALTER TABLE "substitutions" ADD "kind" character varying(10) NOT NULL DEFAULT 'proxy'`);
    await queryRunner.query(`DROP INDEX "public"."UQ_substitutions_teacher_period"`);
    await queryRunner.query(`ALTER TABLE "substitutions" ALTER COLUMN "substitute_user_id" DROP NOT NULL`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_substitutions_teacher_period" ON "substitutions" ("substitute_user_id", "date", "period_no") `,
    );
    await queryRunner.query(
      `ALTER TABLE "substitution_merges" ADD CONSTRAINT "FK_6d5587b8d8d26124825b4b44d4c" FOREIGN KEY ("substitution_id") REFERENCES "substitutions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "substitution_merges" DROP CONSTRAINT "FK_6d5587b8d8d26124825b4b44d4c"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_substitutions_teacher_period"`);
    await queryRunner.query(`ALTER TABLE "substitutions" ALTER COLUMN "substitute_user_id" SET NOT NULL`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_substitutions_teacher_period" ON "substitutions" ("date", "period_no", "substitute_user_id") `,
    );
    await queryRunner.query(`ALTER TABLE "substitutions" DROP COLUMN "kind"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_substitution_merges_target"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_6d5587b8d8d26124825b4b44d4"`);
    await queryRunner.query(`DROP TABLE "substitution_merges"`);
  }
}
