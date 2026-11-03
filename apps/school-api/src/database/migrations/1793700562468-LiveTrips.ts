import { MigrationInterface, QueryRunner } from 'typeorm';

export class LiveTrips1793700562468 implements MigrationInterface {
  name = 'LiveTrips1793700562468';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "transport_trip_events" ("id" SERIAL NOT NULL, "trip_id" integer NOT NULL, "type" character varying(30) NOT NULL, "stop_id" integer, "eta_seconds" integer, "occurred_at" TIMESTAMP WITH TIME ZONE NOT NULL, "source_event_id" integer, "notified" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_fdced22be2276a4921af7c05fce" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_d12953a22201cd1434fddad0f1" ON "transport_trip_events" ("trip_id") `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_transport_trip_events_source" ON "transport_trip_events" ("trip_id", "source_event_id") WHERE source_event_id IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE "transport_boardings" ("id" SERIAL NOT NULL, "school_id" integer NOT NULL, "trip_id" integer NOT NULL, "student_id" integer NOT NULL, "stop_id" integer, "action" character varying(10) NOT NULL, "method" character varying(10) NOT NULL DEFAULT 'manual', "recorded_by" integer, "occurred_at" TIMESTAMP WITH TIME ZONE NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_06a7dcb56678dbe0bb2457c8ab4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_transport_boardings_trip_student" ON "transport_boardings" ("trip_id", "student_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "transport_trips" ("id" SERIAL NOT NULL, "school_id" integer NOT NULL, "route_id" integer NOT NULL, "vehicle_id" integer NOT NULL, "device_id" integer NOT NULL, "kind" character varying(10) NOT NULL, "trip_date" date NOT NULL, "status" character varying(10) NOT NULL DEFAULT 'active', "telematics_trip_id" integer, "stops" jsonb NOT NULL DEFAULT '[]', "last_position" jsonb, "destination_eta_seconds" integer, "started_by" integer, "started_at" TIMESTAMP WITH TIME ZONE NOT NULL, "ended_at" TIMESTAMP WITH TIME ZONE, "end_reason" character varying(20), "not_boarded_sent_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_44f8fa31e37c9f6003efb645e2e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_635f4fa0a417b792956f2eff19" ON "transport_trips" ("route_id") `);
    await queryRunner.query(
      `CREATE INDEX "IDX_eccf1ab1cd06f6aad1eae2bbbb" ON "transport_trips" ("telematics_trip_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_transport_trips_school_date" ON "transport_trips" ("school_id", "trip_date") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_transport_trips_active_vehicle" ON "transport_trips" ("vehicle_id") WHERE status = 'active'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."UQ_transport_trips_active_vehicle"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_transport_trips_school_date"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_eccf1ab1cd06f6aad1eae2bbbb"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_635f4fa0a417b792956f2eff19"`);
    await queryRunner.query(`DROP TABLE "transport_trips"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_transport_boardings_trip_student"`);
    await queryRunner.query(`DROP TABLE "transport_boardings"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_transport_trip_events_source"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_d12953a22201cd1434fddad0f1"`);
    await queryRunner.query(`DROP TABLE "transport_trip_events"`);
  }
}
