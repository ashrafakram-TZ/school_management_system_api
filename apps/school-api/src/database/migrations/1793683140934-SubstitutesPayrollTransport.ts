import { MigrationInterface, QueryRunner } from 'typeorm';

export class SubstitutesPayrollTransport1793683140934 implements MigrationInterface {
  name = 'SubstitutesPayrollTransport1793683140934';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "vehicles" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "created_by" integer, "school_id" integer NOT NULL, "registration_no" character varying(20) NOT NULL, "name" character varying(40) NOT NULL, "make_model" character varying(60), "capacity" smallint NOT NULL DEFAULT '40', "device_id" integer, "device_imei" character varying(20), "driver_user_id" integer, "attendant_user_id" integer, "insurance_expiry" date, "fitness_expiry" date, "puc_expiry" date, "permit_expiry" date, "status" character varying(10) NOT NULL DEFAULT 'active', CONSTRAINT "PK_18d8646b59304dce4af3a9e35b6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_eef3362babd6fffbbd92e5de29" ON "vehicles" ("school_id") `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_vehicles_device" ON "vehicles" ("device_id") WHERE deleted_at IS NULL AND device_id IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_vehicles_school_registration" ON "vehicles" ("school_id", "registration_no") WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE "student_transport" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "created_by" integer, "school_id" integer NOT NULL, "student_id" integer NOT NULL, "route_id" integer NOT NULL, "stop_id" integer NOT NULL, "mode" character varying(10) NOT NULL DEFAULT 'both', "start_date" date NOT NULL, "passenger_ref" character varying(24) NOT NULL, CONSTRAINT "PK_0429d0580b2bf4babdd2df2f354" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_34995f0034474e763be17c3429" ON "student_transport" ("school_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_6ef144fb8297996aa1eee7d68a" ON "student_transport" ("route_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_a998a3f6228a2ff3c2bbb06853" ON "student_transport" ("stop_id") `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_student_transport_passenger_ref" ON "student_transport" ("passenger_ref") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_student_transport_student" ON "student_transport" ("student_id") WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE "route_stops" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "school_id" integer NOT NULL, "route_id" integer NOT NULL, "name" character varying(80) NOT NULL, "landmark" character varying(120), "lat" numeric(9,6) NOT NULL, "lng" numeric(9,6) NOT NULL, "sequence" smallint NOT NULL, "pickup_time" character varying(5), "drop_time" character varying(5), "geofence_radius_m" smallint NOT NULL DEFAULT '100', "monthly_fee" numeric(10,2) NOT NULL DEFAULT '0', CONSTRAINT "PK_22c09afc24c0a7a13644c629073" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_497f704d8b00ccccd7629b3b57" ON "route_stops" ("school_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_route_stops_route_sequence" ON "route_stops" ("route_id", "sequence") `);
    await queryRunner.query(
      `CREATE TABLE "transport_routes" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "created_by" integer, "school_id" integer NOT NULL, "code" character varying(20) NOT NULL, "name" character varying(60) NOT NULL, "vehicle_id" integer, "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_e4eb047cf1dd4133a5fe314ddf7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_ff9f288d2af2942407f8a85ca8" ON "transport_routes" ("school_id") `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_transport_routes_school_code" ON "transport_routes" ("school_id", "code") WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE "fleet_expiry_alerts" ("id" SERIAL NOT NULL, "school_id" integer NOT NULL, "kind" character varying(12) NOT NULL, "ref_id" integer NOT NULL, "expiry_date" date NOT NULL, "threshold_days" smallint NOT NULL, "sent_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_bd6e79731e52c5559d404f9c2df" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_6ae6b215c58b8637514547ad4d" ON "fleet_expiry_alerts" ("school_id") `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_fleet_expiry_alerts" ON "fleet_expiry_alerts" ("kind", "ref_id", "expiry_date", "threshold_days") `,
    );
    await queryRunner.query(
      `CREATE TABLE "substitutions" ("id" SERIAL NOT NULL, "school_id" integer NOT NULL, "date" date NOT NULL, "slot_id" integer NOT NULL, "section_id" integer NOT NULL, "period_no" smallint NOT NULL, "subject_id" integer NOT NULL, "absent_user_id" integer, "substitute_user_id" integer NOT NULL, "note" character varying(255), "assigned_by" integer, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_b432fa1c62d960d9080a9ef927f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_4b3638217110388f35588fb2f4" ON "substitutions" ("school_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_5ae5638550c1324eb0f5064e19" ON "substitutions" ("substitute_user_id") `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_substitutions_teacher_period" ON "substitutions" ("substitute_user_id", "date", "period_no") `,
    );
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_substitutions_slot_date" ON "substitutions" ("slot_id", "date") `);
    await queryRunner.query(
      `CREATE TABLE "payslips" ("id" SERIAL NOT NULL, "school_id" integer NOT NULL, "run_id" integer NOT NULL, "user_id" integer NOT NULL, "employee_no" character varying(30) NOT NULL, "name" character varying(120) NOT NULL, "designation" character varying(80) NOT NULL, "department" character varying(60), "bank_name" character varying(80), "bank_account_last4" character varying(4), "pan_last4" character varying(4), "working_days" smallint NOT NULL, "lop_days" numeric(4,1) NOT NULL DEFAULT '0', "paid_days" numeric(4,1) NOT NULL DEFAULT '0', "basic" numeric(12,2) NOT NULL DEFAULT '0', "da" numeric(12,2) NOT NULL DEFAULT '0', "hra" numeric(12,2) NOT NULL DEFAULT '0', "conveyance" numeric(12,2) NOT NULL DEFAULT '0', "special_allowance" numeric(12,2) NOT NULL DEFAULT '0', "other_allowance" numeric(12,2) NOT NULL DEFAULT '0', "gross" numeric(12,2) NOT NULL DEFAULT '0', "pf" numeric(12,2) NOT NULL DEFAULT '0', "esi" numeric(12,2) NOT NULL DEFAULT '0', "professional_tax" numeric(12,2) NOT NULL DEFAULT '0', "tds" numeric(12,2) NOT NULL DEFAULT '0', "other_deduction" numeric(12,2) NOT NULL DEFAULT '0', "total_deductions" numeric(12,2) NOT NULL DEFAULT '0', "net" numeric(12,2) NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_2b1cd07059daf60cc440c9976e1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_c91a5f11acb103ed6040c8ef49" ON "payslips" ("school_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_ec67d7b4e9735da6ce837b4b73" ON "payslips" ("run_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_a89da43cdfaca26df7a00dfe23" ON "payslips" ("user_id") `);
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_payslips_run_user" ON "payslips" ("run_id", "user_id") `);
    await queryRunner.query(
      `CREATE TABLE "payroll_runs" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "created_by" integer, "school_id" integer NOT NULL, "month" character varying(7) NOT NULL, "status" character varying(10) NOT NULL DEFAULT 'draft', "working_days" smallint NOT NULL, "staff_count" integer NOT NULL DEFAULT '0', "total_gross" numeric(12,2) NOT NULL DEFAULT '0', "total_deductions" numeric(12,2) NOT NULL DEFAULT '0', "total_net" numeric(12,2) NOT NULL DEFAULT '0', "finalized_at" TIMESTAMP WITH TIME ZONE, "finalized_by" integer, CONSTRAINT "PK_6049f42c972640c0eb99ba8035e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_0cf3de5df948d0bf4aca74b295" ON "payroll_runs" ("school_id") `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_payroll_runs_school_month" ON "payroll_runs" ("school_id", "month") WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE "salary_structures" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "created_by" integer, "school_id" integer NOT NULL, "user_id" integer NOT NULL, "effective_from" date NOT NULL, "basic" numeric(12,2) NOT NULL DEFAULT '0', "da" numeric(12,2) NOT NULL DEFAULT '0', "hra" numeric(12,2) NOT NULL DEFAULT '0', "conveyance" numeric(12,2) NOT NULL DEFAULT '0', "special_allowance" numeric(12,2) NOT NULL DEFAULT '0', "other_allowance" numeric(12,2) NOT NULL DEFAULT '0', "pf_enabled" boolean NOT NULL DEFAULT true, "esi_enabled" boolean NOT NULL DEFAULT false, "professional_tax" numeric(12,2) NOT NULL DEFAULT '0', "tds" numeric(12,2) NOT NULL DEFAULT '0', "other_deduction" numeric(12,2) NOT NULL DEFAULT '0', CONSTRAINT "PK_1800f745fd1ebe08981cd422acd" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_d6f79730f7d1c9a626abcb1bce" ON "salary_structures" ("school_id") `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_salary_structures_user" ON "salary_structures" ("user_id") WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(`ALTER TABLE "staff" ADD "licence_no" character varying(20)`);
    await queryRunner.query(`ALTER TABLE "staff" ADD "licence_expiry" date`);
    await queryRunner.query(
      `ALTER TABLE "route_stops" ADD CONSTRAINT "FK_b16cab5c66870949cbb4ee748c0" FOREIGN KEY ("route_id") REFERENCES "transport_routes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "route_stops" DROP CONSTRAINT "FK_b16cab5c66870949cbb4ee748c0"`);
    await queryRunner.query(`ALTER TABLE "staff" DROP COLUMN "licence_expiry"`);
    await queryRunner.query(`ALTER TABLE "staff" DROP COLUMN "licence_no"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_salary_structures_user"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_d6f79730f7d1c9a626abcb1bce"`);
    await queryRunner.query(`DROP TABLE "salary_structures"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_payroll_runs_school_month"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_0cf3de5df948d0bf4aca74b295"`);
    await queryRunner.query(`DROP TABLE "payroll_runs"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_payslips_run_user"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_a89da43cdfaca26df7a00dfe23"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ec67d7b4e9735da6ce837b4b73"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_c91a5f11acb103ed6040c8ef49"`);
    await queryRunner.query(`DROP TABLE "payslips"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_substitutions_slot_date"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_substitutions_teacher_period"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_5ae5638550c1324eb0f5064e19"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_4b3638217110388f35588fb2f4"`);
    await queryRunner.query(`DROP TABLE "substitutions"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_fleet_expiry_alerts"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_6ae6b215c58b8637514547ad4d"`);
    await queryRunner.query(`DROP TABLE "fleet_expiry_alerts"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_transport_routes_school_code"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ff9f288d2af2942407f8a85ca8"`);
    await queryRunner.query(`DROP TABLE "transport_routes"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_route_stops_route_sequence"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_497f704d8b00ccccd7629b3b57"`);
    await queryRunner.query(`DROP TABLE "route_stops"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_student_transport_student"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_student_transport_passenger_ref"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_a998a3f6228a2ff3c2bbb06853"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_6ef144fb8297996aa1eee7d68a"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_34995f0034474e763be17c3429"`);
    await queryRunner.query(`DROP TABLE "student_transport"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_vehicles_school_registration"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_vehicles_device"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_eef3362babd6fffbbd92e5de29"`);
    await queryRunner.query(`DROP TABLE "vehicles"`);
  }
}
