import { MigrationInterface, QueryRunner } from 'typeorm';

export class FleetBoardingAlerts1793766845986 implements MigrationInterface {
  name = 'FleetBoardingAlerts1793766845986';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_transport_boardings_trip_student"`);
    await queryRunner.query(
      `CREATE TABLE "fleet_alerts" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "created_by" integer, "school_id" integer NOT NULL, "kind" character varying(20) NOT NULL, "severity" character varying(10) NOT NULL, "status" character varying(15) NOT NULL DEFAULT 'open', "source" character varying(12) NOT NULL, "source_ref" character varying(120), "trip_id" integer, "vehicle_id" integer, "route_id" integer, "device_id" integer, "raised_by" integer, "message" character varying(300) NOT NULL, "position" jsonb, "data" jsonb NOT NULL DEFAULT '{}', "raised_at" TIMESTAMP WITH TIME ZONE NOT NULL, "notified" integer NOT NULL DEFAULT '0', "acknowledged_by" integer, "acknowledged_at" TIMESTAMP WITH TIME ZONE, "resolved_by" integer, "resolved_at" TIMESTAMP WITH TIME ZONE, "resolution_note" character varying(500), CONSTRAINT "PK_12c4652dbe102e7c5f791079d00" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_ea2d779b243defd62d6acf5699" ON "fleet_alerts" ("school_id") `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_fleet_alerts_source_ref" ON "fleet_alerts" ("source", "source_ref") WHERE source_ref IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fleet_alerts_school_raised" ON "fleet_alerts" ("school_id", "raised_at") `,
    );
    await queryRunner.query(`CREATE INDEX "IDX_fleet_alerts_school_status" ON "fleet_alerts" ("school_id", "status") `);
    await queryRunner.query(
      `CREATE INDEX "IDX_transport_boardings_school_occurred" ON "transport_boardings" ("school_id", "occurred_at") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_transport_boardings_trip_student_action" ON "transport_boardings" ("trip_id", "student_id", "action") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."UQ_transport_boardings_trip_student_action"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_transport_boardings_school_occurred"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_fleet_alerts_school_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_fleet_alerts_school_raised"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_fleet_alerts_source_ref"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ea2d779b243defd62d6acf5699"`);
    await queryRunner.query(`DROP TABLE "fleet_alerts"`);
    await queryRunner.query(
      `CREATE INDEX "IDX_transport_boardings_trip_student" ON "transport_boardings" ("student_id", "trip_id") `,
    );
  }
}
