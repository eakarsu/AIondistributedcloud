'use strict';
require('dotenv').config({ path: require('node:path').resolve(__dirname, '../../.env') });
const fs = require('node:fs');
const path = require('node:path');
const bcrypt = require('bcryptjs');
const pool = require('../db');

async function main() {
  if (process.env.ALLOW_SCHEMA_MIGRATION !== 'true') throw new Error('ALLOW_SCHEMA_MIGRATION=true is required');
  const client = await pool.connect();
  try {
    await client.query('CREATE TABLE IF NOT EXISTS schema_migrations(name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
    const directory = path.resolve(__dirname, '../migrations');
    for (const name of fs.readdirSync(directory).filter((value) => value.endsWith('.sql')).sort()) {
      if ((await client.query('SELECT 1 FROM schema_migrations WHERE name=$1', [name])).rowCount) continue;
      const sql = fs.readFileSync(path.join(directory, name), 'utf8').trim().replace(/^BEGIN;\s*/, '').replace(/\s*COMMIT;$/, '');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations(name) VALUES($1)', [name]);
        await client.query('COMMIT');
      } catch (error) { await client.query('ROLLBACK'); throw error; }
    }
    await client.query(`CREATE TABLE IF NOT EXISTS cloud_ai_results (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      tenant_id text NOT NULL, user_id integer NOT NULL REFERENCES users(id),
      input jsonb NOT NULL, result jsonb NOT NULL, model text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )`);
    const email = (process.env.PROVISION_ADMIN_EMAIL || process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const password = process.env.PROVISION_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || '';
    const tenantId = (process.env.TENANT_ID || process.env.GOVERNANCE_TENANT_ID || '').trim();
    if (!email || !tenantId || password.length < 12) throw new Error('Runtime administrator credentials are required');
    await client.query(
      `INSERT INTO users(name,email,password_hash,role,country,tenant_id) VALUES($1,$2,$3,'admin','Global',$4)
       ON CONFLICT(email) DO UPDATE SET name=EXCLUDED.name,password_hash=EXCLUDED.password_hash,role='admin',country='Global',tenant_id=EXCLUDED.tenant_id`,
      ['Runtime Administrator', email, await bcrypt.hash(password, 12), tenantId],
    );
  } finally { client.release(); await pool.end(); }
}

main().catch((error) => { console.error(error.message); process.exit(1); });
