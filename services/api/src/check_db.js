const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function checkSchema() {
  try {
    const res = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'users';
    `);
    console.log('Users table schema:');
    console.table(res.rows);
    
    const constraints = await pool.query(`
      SELECT conname, pg_get_constraintdef(c.oid)
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE conrelid = 'users'::regclass;
    `);
    console.log('Constraints:');
    console.table(constraints.rows);

  } catch (err) {
    console.error('Error checking schema:', err.message);
  } finally {
    await pool.end();
  }
}

checkSchema();
