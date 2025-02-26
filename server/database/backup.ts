import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { db } from '@db';
import { sql } from 'drizzle-orm';

const execAsync = promisify(exec);

const BACKUP_DIR = path.join(process.cwd(), 'backups');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

export async function createBackup(): Promise<string> {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(BACKUP_DIR, `backup-${timestamp}.sql`);

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not set');
    }

    // Parse connection details from DATABASE_URL
    const url = new URL(databaseUrl);
    const config = {
      host: url.hostname,
      port: url.port,
      database: url.pathname.slice(1), // Remove leading slash
      user: url.username,
      password: decodeURIComponent(url.password),
    };

    // Use plain text format instead of custom format for better compatibility
    const command = `PGPASSWORD=${config.password} pg_dump -h ${config.host} -p ${config.port} -U ${config.user} -d ${config.database} --clean --if-exists -F p -f "${backupPath}"`;

    console.log('Executing backup command...');
    await execAsync(command);
    console.log('Backup completed successfully');

    return backupPath;
  } catch (error) {
    console.error('Backup failed:', error);
    throw new Error('Failed to create database backup');
  }
}

export async function restoreBackup(backupPath: string): Promise<void> {
  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not set');
    }

    // Parse connection details from DATABASE_URL
    const url = new URL(databaseUrl);
    const config = {
      host: url.hostname,
      port: url.port,
      database: url.pathname.slice(1), // Remove leading slash
      user: url.username,
      password: decodeURIComponent(url.password),
    };

    // Drop existing connections
    await db.execute(sql`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = ${config.database}
        AND pid <> pg_backend_pid()
        AND state in ('idle', 'idle in transaction', 'idle in transaction (aborted)', 'disabled')
    `);

    // Restore using psql since we're using plain text format
    const command = `PGPASSWORD=${config.password} psql -h ${config.host} -p ${config.port} -U ${config.user} -d ${config.database} -f "${backupPath}"`;

    console.log('Executing restore command...');
    await execAsync(command);
    console.log('Restore completed successfully');
  } catch (error) {
    console.error('Restore failed:', error);
    throw new Error('Failed to restore database backup');
  }
}

export async function listBackups(): Promise<string[]> {
  const files = await fs.promises.readdir(BACKUP_DIR);
  return files
    .filter(file => file.endsWith('.sql'))
    .map(file => path.join(BACKUP_DIR, file));
}