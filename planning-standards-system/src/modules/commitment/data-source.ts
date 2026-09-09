import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { Commitment } from './database/commitment.entity';
import { CommitmentItem } from './database/commitment-item.entity';
import { CommitmentVersion } from './database/commitment-version.entity';
import { PendingAuditEvent } from './database/pending-audit-event.entity';

// Reads the local .env file directly -- the TypeORM CLI runs outside NestJS
// so ConfigService is not available here.
dotenv.config();

/**
 * AppDataSource -- TypeORM CLI entry point for commitment.
 *
 * Usage:
 *   npm run migration:generate -- database/migrations/<Name>
 *   npm run migration:run
 *   npm run migration:revert
 *   npm run migration:show
 *
 * NOTE: port is the host-mapped port (5444 from docker-compose), not the
 * internal container port (5432). The CLI connects from the host machine.
 */
export const AppDataSource = new DataSource({
  type: 'postgres',
  host:     process.env.DB_HOST     ?? 'localhost',
  port:     Number(process.env.DB_PORT ?? 5444),
  username: process.env.DB_USERNAME ?? 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME     ?? 'commitment-db',
  entities: [Commitment, CommitmentItem, CommitmentVersion, PendingAuditEvent],
  migrations: ['database/migrations/*.ts'],
  migrationsTableName: 'typeorm_migrations',
  synchronize: false, // CLI-only file — migrations are the source of truth here
});
