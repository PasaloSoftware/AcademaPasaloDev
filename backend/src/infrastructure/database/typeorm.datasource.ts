import 'dotenv/config';
import { DataSource } from 'typeorm';
import { technicalSettings } from '@config/technical-settings';

const readRequiredEnv = (name: string): string => {
  const value = String(process.env[name] ?? '').trim();
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
};

const readDbPort = (): number => {
  const rawPort = String(process.env.DB_PORT ?? '3306').trim();
  const parsed = Number(rawPort);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid DB_PORT value: ${rawPort}`);
  }
  return parsed;
};

const dataSource = new DataSource({
  type: 'mysql',
  host: readRequiredEnv('DB_HOST'),
  port: readDbPort(),
  username: readRequiredEnv('DB_USER'),
  password: String(process.env.DB_PASSWORD ?? ''),
  database: readRequiredEnv('DB_NAME'),
  entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../../database/migrations/*{.ts,.js}'],
  migrationsTableName: 'schema_migrations',
  synchronize: false,
  timezone: technicalSettings.database.typeorm.timezone,
  extra: {
    connectionLimit: technicalSettings.database.typeorm.pool.connectionLimit,
    waitForConnections:
      technicalSettings.database.typeorm.pool.waitForConnections,
    queueLimit: technicalSettings.database.typeorm.pool.queueLimit,
    connectTimeout: technicalSettings.database.typeorm.pool.connectTimeoutMs,
  },
});

export default dataSource;
