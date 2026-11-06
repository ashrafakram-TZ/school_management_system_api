import { MigrationInterface, QueryRunner } from 'typeorm';

export class StaffBankAccounts1793951000000 implements MigrationInterface {
  name = 'StaffBankAccounts1793951000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "staff_bank_accounts" (
        "id" SERIAL NOT NULL,
        "school_id" integer NOT NULL,
        "staff_id" integer NOT NULL,
        "account_holder" character varying(120) NOT NULL,
        "bank_name" character varying(80) NOT NULL,
        "ifsc" character varying(11) NOT NULL,
        "account_no_enc" text NOT NULL,
        "account_no_last4" character varying(4) NOT NULL,
        "pan_enc" text,
        "pan_last4" character varying(4),
        "is_primary" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_staff_bank_accounts_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_staff_bank_accounts_staff" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_staff_bank_accounts_staff_id" ON "staff_bank_accounts" ("staff_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_staff_bank_accounts_school_id" ON "staff_bank_accounts" ("school_id")`,
    );

    await queryRunner.query(`
      INSERT INTO "staff_bank_accounts" (
        "school_id", "staff_id", "account_holder", "bank_name", "ifsc",
        "account_no_enc", "account_no_last4", "pan_enc", "pan_last4", "is_primary", "created_at", "updated_at"
      )
      SELECT
        "school_id", "id", "bank_account_holder", "bank_name", "bank_ifsc",
        "bank_account_enc", "bank_account_last4", "pan_enc", "pan_last4", true, now(), now()
      FROM "staff"
      WHERE "bank_account_holder" IS NOT NULL
        AND "bank_account_enc" IS NOT NULL
        AND "bank_ifsc" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "staff_bank_accounts"`);
  }
}

