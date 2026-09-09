import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { Service } from './database/service.entity';
import { ServiceVersion } from './database/service-version.entity';
import { IntakeField } from './database/service-intake-field.entity';
import { NaFlag } from './database/service-na-flag.entity';
import { ServiceMode } from './database/service-mode.entity';

// Reads the local .env file directly -- the TypeORM CLI runs outside NestJS
// so ConfigService is not available here.
dotenv.config();

/**
 * AppDataSource -- TypeORM CLI entry point for service-catalogue.
 *
 * Usage:
 *   npm run migration:generate -- src/database/migrations/<Name>
 *   npm run migration:run
 *   npm run migration:revert
 *   npm run migration:show
 *
 * NOTE: port is the host-mapped port (5442 from docker-compose), not the
 * internal container port (5432). The CLI connects from the host machine.
 */
export const AppDataSource = new DataSource({
  type: 'postgres',
  host:     process.env.DB_HOST     ?? 'localhost',
  port:     Number(process.env.DB_PORT ?? 5442),
  username: process.env.DB_USERNAME ?? 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME     ?? 'service-catalogue-db',
  entities: [Service, ServiceVersion, IntakeField, NaFlag, ServiceMode],
  migrations: ['database/migrations/*.ts'],
  migrationsTableName: 'typeorm_migrations',
  // synchronize MUST be false here -- migrations are the source of truth
  // when using the CLI. synchronize: true in app.module.ts handles the
  // live app; this file is CLI-only.
  synchronize: false,
});
