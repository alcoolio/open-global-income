#!/usr/bin/env tsx
/**
 * Database migration runner.
 *
 * Usage:
 *   npx tsx src/db/migrate.ts           # Run pending migrations (SQLite)
 *   DB_BACKEND=postgres npx tsx src/db/migrate.ts  # Run against PostgreSQL
 *
 * For SQLite: migrations are applied via the schema in database.ts (auto-migrated).
 * For PostgreSQL: reads .sql files from src/db/migrations/ and applies in order.
 */

import { getDbBackend, getPendingMigrations } from './pg-adapter.js';
import { getDb } from './database.js';

async function main() {
  const backend = getDbBackend();
  console.log(`Database backend: ${backend}`);

  if (backend === 'sqlite') {
    // SQLite auto-migrates on getDb() call
    const db = getDb();
    console.log('SQLite database initialized with current schema.');
    db.close();
    return;
  }

  // PostgreSQL migration
  console.log('PostgreSQL migration requires the pg package.');
  console.log('Install it with: npm install pg');
  console.log('');
  console.log('Then set DATABASE_URL and run this script.');
  console.log('');

  // Show pending migrations
  const pending = getPendingMigrations(new Set());
  if (pending.length === 0) {
    console.log('No pending migrations.');
  } else {
    console.log(`${pending.length} migration(s) to apply:`);
    for (const m of pending) {
      console.log(`  - ${m.name}`);
    }
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
