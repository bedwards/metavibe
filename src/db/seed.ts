import { Pool } from 'pg';
import { config } from 'dotenv';

config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function seed() {
  const client = await pool.connect();

  try {
    console.info('Seeding database...');

    // Add your seed data here
    // Example:
    // await client.query(`
    //   INSERT INTO app.users (email, name) VALUES
    //   ('test@example.com', 'Test User')
    //   ON CONFLICT (email) DO NOTHING
    // `);

    console.info('Seeding complete.');
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err: unknown) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
