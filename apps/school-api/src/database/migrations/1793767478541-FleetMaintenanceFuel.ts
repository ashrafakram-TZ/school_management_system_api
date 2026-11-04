import { MigrationInterface, QueryRunner } from 'typeorm';

export class FleetMaintenanceFuel1793767478541 implements MigrationInterface {
  name = 'FleetMaintenanceFuel1793767478541';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "fuel_logs" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "created_by" integer, "school_id" integer NOT NULL, "vehicle_id" integer NOT NULL, "filled_on" date NOT NULL, "litres" numeric(8,2) NOT NULL, "amount" numeric(10,2) NOT NULL, "odometer_km" numeric(10,1) NOT NULL, "station" character varying(100), "bill_file_id" integer, "filled_by" integer, CONSTRAINT "PK_efe05f298e5aaa65a00c877756e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_66471677bba6c7613c09b5637e" ON "fuel_logs" ("school_id") `);
    await queryRunner.query(
      `CREATE INDEX "IDX_fuel_logs_school_vehicle_date" ON "fuel_logs" ("school_id", "vehicle_id", "filled_on") `,
    );
    await queryRunner.query(
      `CREATE TABLE "maintenance_tickets" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "created_by" integer, "school_id" integer NOT NULL, "vehicle_id" integer NOT NULL, "source" character varying(10) NOT NULL, "fault_code" character varying(5), "severity" character varying(10), "title" character varying(150) NOT NULL, "description" character varying(1000), "status" character varying(12) NOT NULL DEFAULT 'open', "opened_at" TIMESTAMP WITH TIME ZONE NOT NULL, "closed_at" TIMESTAMP WITH TIME ZONE, "cost" numeric(12,2), "vendor" character varying(100), "odometer_km" numeric(10,1), "notes" character varying(1000), "telematics_fault_id" integer, CONSTRAINT "PK_6864618af429f4de6b8aede5afa" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_bc32f6b7e017e33a4455113a6e" ON "maintenance_tickets" ("school_id") `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_maintenance_tickets_fault" ON "maintenance_tickets" ("telematics_fault_id") WHERE telematics_fault_id IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_maintenance_tickets_school_vehicle" ON "maintenance_tickets" ("school_id", "vehicle_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_maintenance_tickets_school_status" ON "maintenance_tickets" ("school_id", "status") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_maintenance_tickets_school_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_maintenance_tickets_school_vehicle"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_maintenance_tickets_fault"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_bc32f6b7e017e33a4455113a6e"`);
    await queryRunner.query(`DROP TABLE "maintenance_tickets"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_fuel_logs_school_vehicle_date"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_66471677bba6c7613c09b5637e"`);
    await queryRunner.query(`DROP TABLE "fuel_logs"`);
  }
}
