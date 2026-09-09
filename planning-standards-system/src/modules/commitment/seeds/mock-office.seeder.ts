/**
 * MockOfficeSeeder
 *
 * Inserts two isolated mock offices into the commitment database for
 * multi-office data-isolation testing.
 *
 * Usage (run once after migrations are applied):
 *   ts-node -r tsconfig-paths/register src/modules/commitment/database/seeds/mock-office.seeder.ts
 *
 * Or call `MockOfficeSeeder.run(dataSource)` programmatically (e.g. from
 * main.ts when SEED_ON_BOOT=true).
 *
 * Safety:
 *  - All inserts use INSERT ... ON CONFLICT DO NOTHING so the seeder is
 *    idempotent – running it twice will not create duplicates or throw.
 *  - Only the commitment-related tables are touched (commitment,
 *    commitment_item).  No other module's tables are modified.
 */

import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as dotenv from 'dotenv';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Seed data definitions
// ---------------------------------------------------------------------------

/**
 * Office 1 – the original mock office.
 * Kept stable so existing tests / front-end demos are unaffected.
 */
const OFFICE_1 = {
    office_id:  'mock-office',
    name:       'Mock Office 1',
    actor_id:   'mock-actor',
    period_id:  'mock-period-001',    // must exist in kpi-sla-db; used only as FK value
    commitment: {
        id:         '00000000-0000-0000-0000-000000000001',
        status:     'Draft',
        version:    1,
        created_by: 'mock-actor',
    },
    items: [
        {
            id:           '00000000-0000-0000-0001-000000000001',
            service_id:   'mock-service-001',
            kpi_id:       'mock-kpi-001',
            target_value: 95.0000,
            unit:         'PERCENT',
        },
        {
            id:           '00000000-0000-0000-0001-000000000002',
            service_id:   'mock-service-002',
            kpi_id:       'mock-kpi-002',
            target_value: 10.0000,
            unit:         'DAYS',
        },
    ],
};

/**
 * Office 2 – second mock office for isolation testing.
 * Uses entirely separate UUIDs, period_id, service_ids and kpi_ids.
 */
const OFFICE_2 = {
    office_id:  'mock-office-2',
    name:       'Mock Office 2',
    actor_id:   'mock-actor-2',
    period_id:  'mock-period-002',    // separate period for clean isolation
    commitment: {
        id:         '00000000-0000-0000-0000-000000000002',
        status:     'Draft',
        version:    1,
        created_by: 'mock-actor-2',
    },
    items: [
        {
            id:           '00000000-0000-0000-0002-000000000001',
            service_id:   'mock-service-003',
            kpi_id:       'mock-kpi-003',
            target_value: 90.0000,
            unit:         'PERCENT',
        },
        {
            id:           '00000000-0000-0000-0002-000000000002',
            service_id:   'mock-service-004',
            kpi_id:       'mock-kpi-004',
            target_value: 5.0000,
            unit:         'COUNT',
        },
    ],
};

// ---------------------------------------------------------------------------
// Seeder implementation
// ---------------------------------------------------------------------------

export class MockOfficeSeeder {
    /**
     * Seeds both mock offices.
     *
     * @param dataSource  An initialised TypeORM DataSource connected to the
     *                    commitment-db PostgreSQL database.
     */
    static async run(dataSource: DataSource): Promise<void> {
        const runner = dataSource.createQueryRunner();
        await runner.connect();
        await runner.startTransaction();

        try {
            for (const office of [OFFICE_1, OFFICE_2]) {
                // ── 1. Insert the parent commitment row ─────────────────────
                await runner.query(
                    `
                    INSERT INTO "commitment"
                        (id, office, period_id, status, version_number,
                         submitted_by, submitted_at, locked_by, locked_at,
                         created_by, created_at, updated_at)
                    VALUES
                        ($1, $2, $3, $4, $5,
                         NULL, NULL, NULL, NULL,
                         $6, NOW(), NOW())
                    ON CONFLICT (office, period_id) DO NOTHING
                    `,
                    [
                        office.commitment.id,
                        office.office_id,
                        office.period_id,
                        office.commitment.status,
                        office.commitment.version,
                        office.commitment.created_by,
                    ],
                );

                // ── 2. Insert commitment items linked to this commitment ─────
                for (const item of office.items) {
                    await runner.query(
                        `
                        INSERT INTO "commitment_item"
                            (id, commitment_id, service_id, kpi_id,
                             target_value, unit, created_at)
                        VALUES
                            ($1, $2, $3, $4, $5, $6, NOW())
                        ON CONFLICT (id) DO NOTHING
                        `,
                        [
                            item.id,
                            office.commitment.id,
                            item.service_id,
                            item.kpi_id,
                            item.target_value,
                            item.unit,
                        ],
                    );
                }

                console.log(
                    `[MockOfficeSeeder] Seeded office "${office.name}" ` +
                    `(${office.office_id}) with ${office.items.length} commitment item(s).`,
                );
            }

            await runner.commitTransaction();
            console.log('[MockOfficeSeeder] All offices seeded successfully.');
        } catch (err) {
            await runner.rollbackTransaction();
            console.error('[MockOfficeSeeder] Seeding failed, transaction rolled back:', err);
            throw err;
        } finally {
            await runner.release();
        }
    }
}

// ---------------------------------------------------------------------------
// Standalone runner (ts-node entry point)
// ---------------------------------------------------------------------------

async function runStandalone(): Promise<void> {
    // Load .env from the commitment module directory
    dotenv.config({ path: path.resolve(__dirname, '../../.env') });

    const dataSource = new DataSource({
        type: 'postgres',
        host:     process.env.DB_HOST     ?? 'localhost',
        port:     Number(process.env.DB_PORT ?? 5432),
        username: process.env.DB_USERNAME ?? 'postgres',
        password: process.env.DB_PASSWORD ?? '',
        database: process.env.DB_NAME     ?? 'commitment-db',
        entities: [path.resolve(__dirname, '../**/*.entity.{ts,js}')],
        synchronize: false,
    });

    await dataSource.initialize();
    console.log('[MockOfficeSeeder] DataSource initialised.');

    try {
        await MockOfficeSeeder.run(dataSource);
    } finally {
        await dataSource.destroy();
        console.log('[MockOfficeSeeder] DataSource closed.');
    }
}

// Only run when executed directly (not when imported as a module)
if (require.main === module) {
    runStandalone().catch((err) => {
        console.error('[MockOfficeSeeder] Fatal error:', err);
        process.exit(1);
    });
}