import { MigrationInterface, QueryRunner } from 'typeorm';

export class Foundation1793607590440 implements MigrationInterface {
  name = 'Foundation1793607590440';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "permissions" ("id" SERIAL NOT NULL, "code" character varying(60) NOT NULL, "name" character varying(150) NOT NULL, "group_name" character varying(40) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_920331560282b8bd21bb02290df" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_permissions_code" ON "permissions" ("code") `);
    await queryRunner.query(
      `CREATE TABLE "roles" ("id" SERIAL NOT NULL, "code" character varying(40) NOT NULL, "name" character varying(80) NOT NULL, "description" character varying(255), "app" character varying(10) NOT NULL, "is_system" boolean NOT NULL DEFAULT true, "sort_order" smallint NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_roles_code" ON "roles" ("code") `);
    await queryRunner.query(
      `CREATE TABLE "schools" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "created_by" integer, "name" character varying(150) NOT NULL, "code" character varying(20) NOT NULL, "board" character varying(10), "address" text, "city" character varying(80), "state" character varying(80), "pincode" character varying(10), "phone" character varying(20), "emergency_phone" character varying(20), "email" character varying(150), "logo_file_id" integer, "timezone" character varying(50) NOT NULL DEFAULT 'Asia/Kolkata', "latitude" double precision, "longitude" double precision, "geofence_radius_m" integer NOT NULL DEFAULT '200', "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_95b932e47ac129dd8e23a0db548" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_schools_code" ON "schools" ("code") WHERE deleted_at IS NULL`);
    await queryRunner.query(
      `CREATE TABLE "users" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "created_by" integer, "school_id" integer, "name" character varying(120) NOT NULL, "mobile" character varying(10) NOT NULL, "email" character varying(150), "status" character varying(10) NOT NULL DEFAULT 'active', "language" character varying(5) NOT NULL DEFAULT 'en', "photo_file_id" integer, "last_login_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_25e1cf8f41bae2f3d11f3c2a02" ON "users" ("school_id") `);
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_users_mobile" ON "users" ("mobile") WHERE deleted_at IS NULL`);
    await queryRunner.query(
      `CREATE TABLE "user_roles" ("id" SERIAL NOT NULL, "user_id" integer NOT NULL, "role_id" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_8acd5cf26ebd158416f477de799" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_b23c65e50a758245a33ee35fda" ON "user_roles" ("role_id") `);
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_user_roles_user_role" ON "user_roles" ("user_id", "role_id") `);
    await queryRunner.query(
      `CREATE TABLE "user_devices" ("id" SERIAL NOT NULL, "user_id" integer NOT NULL, "session_id" integer, "fcm_token" character varying(512) NOT NULL, "platform" character varying(10) NOT NULL, "app" character varying(10), "device_name" character varying(100), "app_version" character varying(20), "last_seen_at" TIMESTAMP WITH TIME ZONE NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_c9e7e648903a9e537347aba4371" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_28bd79e1b3f7c1168f0904ce24" ON "user_devices" ("user_id") `);
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_user_devices_token" ON "user_devices" ("fcm_token") `);
    await queryRunner.query(
      `CREATE TABLE "notifications" ("id" SERIAL NOT NULL, "school_id" integer, "user_id" integer NOT NULL, "batch_id" uuid NOT NULL, "channel" character varying(10) NOT NULL, "category" character varying(20) NOT NULL, "template_code" character varying(60), "title" character varying(200) NOT NULL, "body" text NOT NULL, "data" jsonb NOT NULL DEFAULT '{}', "status" character varying(10) NOT NULL, "recipient" character varying(255), "provider" character varying(20), "provider_ref" character varying(255), "error" text, "attempts" smallint NOT NULL DEFAULT '0', "sent_at" TIMESTAMP WITH TIME ZONE, "read_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_7f3fdb086b7b384df55f634c54" ON "notifications" ("school_id") `);
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_channel_status" ON "notifications" ("channel", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_user_channel_created" ON "notifications" ("user_id", "channel", "created_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "notification_templates" ("id" SERIAL NOT NULL, "code" character varying(60) NOT NULL, "language" character varying(5) NOT NULL, "category" character varying(20) NOT NULL, "title" character varying(200) NOT NULL, "body" text NOT NULL, "sms_body" text, "dlt_template_id" character varying(40), "push" boolean NOT NULL DEFAULT true, "sms" character varying(10) NOT NULL DEFAULT 'never', "critical" boolean NOT NULL DEFAULT false, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_76f0fc48b8d057d2ae7f3a2848a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_notification_templates_code_language" ON "notification_templates" ("code", "language") `,
    );
    await queryRunner.query(
      `CREATE TABLE "files" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "created_by" integer, "school_id" integer, "storage_key" character varying(255) NOT NULL, "thumbnail_key" character varying(255), "original_name" character varying(255) NOT NULL, "mime_type" character varying(100) NOT NULL, "size_bytes" integer NOT NULL, "width" integer, "height" integer, "purpose" character varying(40) NOT NULL DEFAULT 'general', "scan_status" character varying(15) NOT NULL DEFAULT 'not_scanned', CONSTRAINT "PK_6c16b9093a142e0e7613b04a3d9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_368aa8317b082939527b8b88ef" ON "files" ("school_id") `);
    await queryRunner.query(
      `CREATE TABLE "user_sessions" ("id" SERIAL NOT NULL, "user_id" integer NOT NULL, "refresh_token_hash" character varying(64) NOT NULL, "app" character varying(10), "platform" character varying(10), "device_name" character varying(100), "ip" character varying(45), "user_agent" character varying(255), "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "last_used_at" TIMESTAMP WITH TIME ZONE NOT NULL, "revoked_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_e93e031a5fed190d4789b6bfd83" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_e9658e959c490b0a634dfc5478" ON "user_sessions" ("user_id") `);
    await queryRunner.query(
      `CREATE TABLE "otp_requests" ("id" SERIAL NOT NULL, "mobile" character varying(10) NOT NULL, "code_hash" character varying(64) NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "attempts" smallint NOT NULL DEFAULT '0', "consumed_at" TIMESTAMP WITH TIME ZONE, "ip" character varying(45), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_265771409bf4605d16150e2d045" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_otp_requests_mobile_created" ON "otp_requests" ("mobile", "created_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "role_permissions" ("role_id" integer NOT NULL, "permission_id" integer NOT NULL, CONSTRAINT "PK_25d24010f53bb80b78e412c9656" PRIMARY KEY ("role_id", "permission_id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_178199805b901ccd220ab7740e" ON "role_permissions" ("role_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_17022daf3f885f7d35423e9971" ON "role_permissions" ("permission_id") `);
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_25e1cf8f41bae2f3d11f3c2a028" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_roles" ADD CONSTRAINT "FK_87b8888186ca9769c960e926870" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_roles" ADD CONSTRAINT "FK_b23c65e50a758245a33ee35fda1" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_devices" ADD CONSTRAINT "FK_28bd79e1b3f7c1168f0904ce241" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "FK_9a8a82462cab47c73d25f49261f" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_sessions" ADD CONSTRAINT "FK_e9658e959c490b0a634dfc54783" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_178199805b901ccd220ab7740ec" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_17022daf3f885f7d35423e9971e" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_17022daf3f885f7d35423e9971e"`);
    await queryRunner.query(`ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_178199805b901ccd220ab7740ec"`);
    await queryRunner.query(`ALTER TABLE "user_sessions" DROP CONSTRAINT "FK_e9658e959c490b0a634dfc54783"`);
    await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_9a8a82462cab47c73d25f49261f"`);
    await queryRunner.query(`ALTER TABLE "user_devices" DROP CONSTRAINT "FK_28bd79e1b3f7c1168f0904ce241"`);
    await queryRunner.query(`ALTER TABLE "user_roles" DROP CONSTRAINT "FK_b23c65e50a758245a33ee35fda1"`);
    await queryRunner.query(`ALTER TABLE "user_roles" DROP CONSTRAINT "FK_87b8888186ca9769c960e926870"`);
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_25e1cf8f41bae2f3d11f3c2a028"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_17022daf3f885f7d35423e9971"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_178199805b901ccd220ab7740e"`);
    await queryRunner.query(`DROP TABLE "role_permissions"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_otp_requests_mobile_created"`);
    await queryRunner.query(`DROP TABLE "otp_requests"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_e9658e959c490b0a634dfc5478"`);
    await queryRunner.query(`DROP TABLE "user_sessions"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_368aa8317b082939527b8b88ef"`);
    await queryRunner.query(`DROP TABLE "files"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_notification_templates_code_language"`);
    await queryRunner.query(`DROP TABLE "notification_templates"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_notifications_user_channel_created"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_notifications_channel_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_7f3fdb086b7b384df55f634c54"`);
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_user_devices_token"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_28bd79e1b3f7c1168f0904ce24"`);
    await queryRunner.query(`DROP TABLE "user_devices"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_user_roles_user_role"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_b23c65e50a758245a33ee35fda"`);
    await queryRunner.query(`DROP TABLE "user_roles"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_users_mobile"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_25e1cf8f41bae2f3d11f3c2a02"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_schools_code"`);
    await queryRunner.query(`DROP TABLE "schools"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_roles_code"`);
    await queryRunner.query(`DROP TABLE "roles"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_permissions_code"`);
    await queryRunner.query(`DROP TABLE "permissions"`);
  }
}
