import { MigrationInterface, QueryRunner } from 'typeorm';

export class AppBanners1793794151472 implements MigrationInterface {
  name = 'AppBanners1793794151472';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "app_banners" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "created_by" integer, "school_id" integer NOT NULL, "title" character varying(80) NOT NULL, "message" character varying(200), "image_file_id" integer NOT NULL, "audience" character varying(10) NOT NULL DEFAULT 'all', "starts_on" date NOT NULL, "ends_on" date NOT NULL, "link_url" character varying(300), "sort_order" smallint NOT NULL DEFAULT '0', "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_b41233344f16d963658078941b5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_ac2bc0e042c3dc7d3b8717cead" ON "app_banners" ("school_id") `);
    await queryRunner.query(
      `CREATE INDEX "IDX_app_banners_school_dates" ON "app_banners" ("school_id", "starts_on", "ends_on") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_app_banners_school_dates"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ac2bc0e042c3dc7d3b8717cead"`);
    await queryRunner.query(`DROP TABLE "app_banners"`);
  }
}
