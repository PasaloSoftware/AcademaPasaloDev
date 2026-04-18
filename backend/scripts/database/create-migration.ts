import { promises as fs } from 'fs';
import * as path from 'path';

const normalizeMigrationName = (rawName: string): string => {
  const normalized = rawName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (!normalized) {
    throw new Error(
      'Invalid migration name. Use letters/numbers, e.g. "add_course_catalog_seed".',
    );
  }

  return normalized;
};

const toPascalCase = (input: string): string =>
  input
    .split(/[^a-zA-Z0-9]/g)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join('');

const nowTimestamp = (): string => {
  const now = new Date();
  const pad = (value: number): string => String(value).padStart(2, '0');
  return [
    now.getUTCFullYear(),
    pad(now.getUTCMonth() + 1),
    pad(now.getUTCDate()),
    pad(now.getUTCHours()),
    pad(now.getUTCMinutes()),
    pad(now.getUTCSeconds()),
  ].join('');
};

const run = async (): Promise<void> => {
  const rawName = process.argv[2];
  if (!rawName) {
    throw new Error(
      'Usage: npm run migration:create -- <name>. Example: npm run migration:create -- add_course_catalog_seed',
    );
  }

  const migrationName = normalizeMigrationName(rawName);
  const timestamp = nowTimestamp();
  const className = `${toPascalCase(migrationName)}${timestamp}`;

  const migrationsDir = path.resolve(
    __dirname,
    '..',
    '..',
    'src',
    'database',
    'migrations',
  );
  await fs.mkdir(migrationsDir, { recursive: true });

  const fileName = `${timestamp}-${migrationName}.ts`;
  const filePath = path.join(migrationsDir, fileName);

  const contents = `import { MigrationInterface, QueryRunner } from 'typeorm';

export class ${className} implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // TODO: Write migration SQL
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Optional in forward-only strategy. Keep empty or add safe revert SQL.
  }
}
`;

  await fs.writeFile(filePath, contents, { encoding: 'utf8', flag: 'wx' });
  console.log(`Created migration: ${filePath}`);
};

void run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[ERROR] ${message}`);
  process.exitCode = 1;
});
