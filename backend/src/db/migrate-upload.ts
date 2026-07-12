import pool from './pool';
import path from 'path';
import fs from 'fs';

/**
 * Run a specific SQL migration file by name.
 * Usage: tsx src/db/migrate-upload.ts
 */
async function migrate() {
  const migrationPath = path.join(__dirname, 'migrations', '001_user_documents.sql');
  const sql = fs.readFileSync(migrationPath, 'utf-8');

  console.log('🗄️  Running user_documents migration...');
  try {
    await pool.query(sql);
    console.log('✅ Migration complete — user_documents table and has_uploaded_documents column added.');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
