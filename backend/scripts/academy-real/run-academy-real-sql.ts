import { promises as fs } from 'fs';
import * as path from 'path';
import mysql from 'mysql2/promise';

type DbConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
};

function getDbConfigFromEnv(): DbConfig {
  const host = String(process.env.DB_HOST || '').trim();
  const port = Number(process.env.DB_PORT || '3306');
  const user = String(process.env.DB_USER || '').trim();
  const password = String(process.env.DB_PASSWORD || '');
  const database = String(process.env.DB_NAME || '').trim();

  if (!host) throw new Error('Falta DB_HOST');
  if (!Number.isFinite(port) || port <= 0) throw new Error('DB_PORT invalido');
  if (!user) throw new Error('Falta DB_USER');
  if (!database) throw new Error('Falta DB_NAME');

  return { host, port, user, password, database };
}

function filePriority(fileName: string): number {
  const normalized = fileName.toLowerCase();
  if (normalized.includes('eliminar')) return 0;
  if (normalized.includes('creacion')) return 1;
  if (normalized.includes('inicial')) return 2;
  if (normalized.includes('cursos')) return 3;
  if (normalized.includes('evaluaciones')) return 4;
  if (normalized.includes('materiales')) return 5;
  return 10;
}

async function getSqlFilesOrdered(sqlDir: string): Promise<string[]> {
  const entries = await fs.readdir(sqlDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.sql'))
    .map((entry) => entry.name);

  if (!files.length) {
    throw new Error(`No se encontraron .sql en: ${sqlDir}`);
  }

  return files.sort((a, b) => {
    const diff = filePriority(a) - filePriority(b);
    if (diff !== 0) return diff;
    return a.localeCompare(b);
  });
}

async function run(): Promise<void> {
  const rootDir = path.resolve(__dirname, '..', '..');
  const sqlDir = path.join(rootDir, 'db', 'academy-real');
  const dbConfig = getDbConfigFromEnv();
  const orderedFiles = await getSqlFilesOrdered(sqlDir);

  console.log('[INFO] Directorio SQL:', sqlDir);
  console.log('[INFO] Orden de ejecucion:');
  orderedFiles.forEach((file, i) => console.log(`  ${i + 1}. ${file}`));

  const connection = await mysql.createConnection({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
    multipleStatements: true,
    charset: 'utf8mb4',
  });

  try {
    for (const file of orderedFiles) {
      const fullPath = path.join(sqlDir, file);
      const sql = await fs.readFile(fullPath, 'utf8');
      console.log(`[RUN] ${file}`);
      await connection.query(sql);
      console.log(`[OK ] ${file}`);
    }
    console.log('[DONE] Ejecucion completa de academy-real.');
  } finally {
    await connection.end();
  }
}

void run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[ERROR] ${message}`);
  process.exitCode = 1;
});
