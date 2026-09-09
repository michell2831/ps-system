import { MigrationInterface, QueryRunner } from "typeorm";

export class InitBaseline1788238812643 implements MigrationInterface {
    name = 'InitBaseline1788238812643'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "service" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "office" character varying(100) NOT NULL,
                "sub_office" character varying(100),
                "name" character varying(300) NOT NULL,
                "service_mode" character varying(150),
                "classification" character varying(150),
                "sla_target_value" integer NOT NULL DEFAULT 1,
                "sla_target_unit" character varying NOT NULL DEFAULT 'Days',
                "responsible_unit" character varying(200) NOT NULL DEFAULT 'Academic Office',
                "with_referral" character varying NOT NULL DEFAULT 'With',
                "required_documents" jsonb DEFAULT '[]',
                "processing_steps" jsonb DEFAULT '[]',
                "expected_output" text,
                "status" character varying NOT NULL DEFAULT 'ACTIVE',
                "archived_at" TIMESTAMP WITH TIME ZONE,
                "archived_by" character varying(100),
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "created_by" character varying(100) NOT NULL DEFAULT 'system',
                CONSTRAINT "PK_service_id" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "service_modes" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying NOT NULL,
                "description" text,
                "is_active" boolean NOT NULL DEFAULT true,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_service_modes_name" UNIQUE ("name"),
                CONSTRAINT "PK_service_modes_id" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "service_service_modes" (
                "service_id" uuid NOT NULL,
                "mode_id" uuid NOT NULL,
                CONSTRAINT "PK_service_service_modes" PRIMARY KEY ("service_id", "mode_id")
            )
        `);

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "service_version" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "service_id" uuid NOT NULL,
                "field_changed" character varying(100) NOT NULL,
                "old_value" text,
                "new_value" text,
                "changed_by" character varying(100) NOT NULL,
                "changed_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_service_version_id" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "intake_field" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "service_id" uuid NOT NULL,
                "label" character varying(200) NOT NULL,
                "field_type" character varying NOT NULL,
                "is_required" boolean NOT NULL DEFAULT false,
                "display_order" integer NOT NULL DEFAULT 0,
                "dropdown_options" jsonb,
                "is_active" boolean NOT NULL DEFAULT true,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_intake_field_id" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "na_flag" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "service_id" uuid NOT NULL,
                "period_id" uuid NOT NULL,
                "reason" text,
                "flagged_by" character varying(100) NOT NULL,
                "flagged_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "removed_at" TIMESTAMP WITH TIME ZONE,
                CONSTRAINT "PK_na_flag_id" PRIMARY KEY ("id")
            )
        `);

        // Index definitions
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_service_name" ON "service" ("name")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_service_mode" ON "service" ("service_mode")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_service_classification" ON "service" ("classification")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_service_status" ON "service" ("status")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_service_version_service_id" ON "service_version" ("service_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_service_version_changed_at" ON "service_version" ("changed_at")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_bc5157e37742869304d0b56855" ON "service_service_modes" ("service_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_e690d8f0143280dfd00e1ae0c8" ON "service_service_modes" ("mode_id")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "service_service_modes"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "service_modes"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "na_flag"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "intake_field"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "service_version"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "service"`);
    }
}
