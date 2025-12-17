import { Pool } from 'pg';
import { config } from 'dotenv';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrate() {
  const client = await pool.connect();

  try {
    // Ensure migrations table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS app.migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Get applied migrations
    const { rows: applied } = await client.query(
      'SELECT name FROM app.migrations ORDER BY id'
    );
    const appliedNames = new Set(applied.map((r: { name: string }) => r.name));

    // Get migration files
    const migrationsDir = join(import.meta.dirname, 'migrations');
    let files: string[] = [];

    try {
      files = readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort();
    } catch {
      console.info('No migrations directory found. Create src/db/migrations/ to add migrations.');
      return;
    }

    // Apply pending migrations
    for (const file of files) {
      if (appliedNames.has(file)) {continue;}

      console.info(`Applying migration: ${file}`);
      const sql = readFileSync(join(migrationsDir, file), 'utf-8');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO app.migrations (name) VALUES ($1)',
          [file]
        );
        await client.query('COMMIT');
        console.info(`Applied: ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }

    console.info('Migrations complete.');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err: unknown) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
