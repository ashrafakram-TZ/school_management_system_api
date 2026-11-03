import { MigrationInterface, QueryRunner } from 'typeorm';

export class Fees1793710901420 implements MigrationInterface {
  name = 'Fees1793710901420';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "fee_plans" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "created_by" integer, "school_id" integer NOT NULL, "academic_year_id" integer NOT NULL, "class_id" integer NOT NULL, "fee_head_id" integer NOT NULL, "installment" character varying(40) NOT NULL, "amount" numeric(12,2) NOT NULL DEFAULT '0', "due_date" date NOT NULL, CONSTRAINT "PK_b2e3f4eab7f5092165f10bc0d01" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_944392bc0bb7a53e1d04f300dc" ON "fee_plans" ("school_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_e50f9773df877e7e02d7b0a671" ON "fee_plans" ("academic_year_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_c5c6e8c83553bb8b37b50a4eb0" ON "fee_plans" ("class_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_79e5f5ddb20bfb37f4dab4e187" ON "fee_plans" ("fee_head_id") `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_fee_plans_line" ON "fee_plans" ("academic_year_id", "class_id", "fee_head_id", "installment") WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE "fee_payments" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "created_by" integer, "school_id" integer NOT NULL, "invoice_id" integer NOT NULL, "student_id" integer NOT NULL, "amount" numeric(12,2) NOT NULL DEFAULT '0', "mode" character varying(16) NOT NULL, "reference" character varying(60), "paid_on" date NOT NULL, "received_by" integer, "receipt_no" character varying(30) NOT NULL, "notes" character varying(300), CONSTRAINT "PK_9bd9fdfc57a96cadaefe822956d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_b8218a2d2103103ba53f73371c" ON "fee_payments" ("school_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_da875354837748c4fca1cc21af" ON "fee_payments" ("invoice_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_95be930f1a87918852588fa4ad" ON "fee_payments" ("student_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_e307a0e8f247a2d4fb804e51f1" ON "fee_payments" ("paid_on") `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_fee_payments_school_receipt" ON "fee_payments" ("school_id", "receipt_no") `,
    );
    await queryRunner.query(
      `CREATE TABLE "fee_invoices" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "created_by" integer, "school_id" integer NOT NULL, "academic_year_id" integer NOT NULL, "student_id" integer NOT NULL, "class_id" integer NOT NULL, "section_id" integer, "invoice_no" character varying(30) NOT NULL, "installment" character varying(40) NOT NULL, "due_date" date NOT NULL, "gross" numeric(12,2) NOT NULL DEFAULT '0', "discount" numeric(12,2) NOT NULL DEFAULT '0', "discount_reason" character varying(200), "total" numeric(12,2) NOT NULL DEFAULT '0', "paid" numeric(12,2) NOT NULL DEFAULT '0', "balance" numeric(12,2) NOT NULL DEFAULT '0', "status" character varying(12) NOT NULL DEFAULT 'unpaid', "cancelled_at" TIMESTAMP WITH TIME ZONE, "cancelled_by" integer, "cancel_reason" character varying(200), "overdue_alerted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_6916959219c76dfb86ecc822ab0" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_642401d8b025edcdd38eea9387" ON "fee_invoices" ("school_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_31ddc60f24bde64b484c0ce091" ON "fee_invoices" ("academic_year_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_14b956ec2d4d139dcf692cf116" ON "fee_invoices" ("student_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_bca9f5347417021b0d5dd2b765" ON "fee_invoices" ("class_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_9a5200170c614277923bc78d0a" ON "fee_invoices" ("section_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_88c9231b6c96b5aab59f29921b" ON "fee_invoices" ("due_date") `);
    await queryRunner.query(`CREATE INDEX "IDX_050e8b0d669f7d04db39c6b61b" ON "fee_invoices" ("status") `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_fee_invoices_student_installment" ON "fee_invoices" ("academic_year_id", "student_id", "installment") WHERE deleted_at IS NULL AND status <> 'cancelled'`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_fee_invoices_school_no" ON "fee_invoices" ("school_id", "invoice_no") `,
    );
    await queryRunner.query(
      `CREATE TABLE "fee_invoice_lines" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "created_by" integer, "school_id" integer NOT NULL, "invoice_id" integer NOT NULL, "fee_head_id" integer, "head_name" character varying(60) NOT NULL, "description" character varying(160), "amount" numeric(12,2) NOT NULL DEFAULT '0', "sort_order" smallint NOT NULL DEFAULT '0', CONSTRAINT "PK_4d93a9d5196d4882562c5734cff" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_bd84733aa2b70daf7e82bc86b1" ON "fee_invoice_lines" ("school_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_20cff38d2b8f74675f5581e3c0" ON "fee_invoice_lines" ("invoice_id") `);
    await queryRunner.query(
      `CREATE TABLE "fee_heads" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "created_by" integer, "school_id" integer NOT NULL, "name" character varying(60) NOT NULL, "code" character varying(20) NOT NULL, "is_transport" boolean NOT NULL DEFAULT false, "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_5e15b796cf6b423c4f411109a44" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_b6727f00fab7d7c3fcc26b056d" ON "fee_heads" ("school_id") `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_fee_heads_school_code" ON "fee_heads" ("school_id", "code") WHERE deleted_at IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."UQ_fee_heads_school_code"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_b6727f00fab7d7c3fcc26b056d"`);
    await queryRunner.query(`DROP TABLE "fee_heads"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_20cff38d2b8f74675f5581e3c0"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_bd84733aa2b70daf7e82bc86b1"`);
    await queryRunner.query(`DROP TABLE "fee_invoice_lines"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_fee_invoices_school_no"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_fee_invoices_student_installment"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_050e8b0d669f7d04db39c6b61b"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_88c9231b6c96b5aab59f29921b"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_9a5200170c614277923bc78d0a"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_bca9f5347417021b0d5dd2b765"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_14b956ec2d4d139dcf692cf116"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_31ddc60f24bde64b484c0ce091"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_642401d8b025edcdd38eea9387"`);
    await queryRunner.query(`DROP TABLE "fee_invoices"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_fee_payments_school_receipt"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_e307a0e8f247a2d4fb804e51f1"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_95be930f1a87918852588fa4ad"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_da875354837748c4fca1cc21af"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_b8218a2d2103103ba53f73371c"`);
    await queryRunner.query(`DROP TABLE "fee_payments"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_fee_plans_line"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_79e5f5ddb20bfb37f4dab4e187"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_c5c6e8c83553bb8b37b50a4eb0"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_e50f9773df877e7e02d7b0a671"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_944392bc0bb7a53e1d04f300dc"`);
    await queryRunner.query(`DROP TABLE "fee_plans"`);
  }
}
