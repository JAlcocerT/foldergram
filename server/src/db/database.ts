import { DatabaseSync } from 'node:sqlite';

import { schemaSql } from './schema.js';
import { storageService } from '../services/storage-service.js';

class DatabaseManager {
  private database: DatabaseSync;

  constructor() {
    this.database = new DatabaseSync(storageService.getDatabasePath());
    this.assertNoLegacySchema();
    this.applyCompatColumnMigrations();
    this.database.exec(schemaSql);
    this.applyCompatIndexes();
  }

  get connection(): DatabaseSync {
    return this.database;
  }

  private tableExists(name: string): boolean {
    const row = this.database
      .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`)
      .get(name) as { name: string } | undefined;

    return row?.name === name;
  }

  private tableHasColumn(tableName: string, columnName: string): boolean {
    if (!this.tableExists(tableName)) {
      return false;
    }

    const columns = this.database.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
    return columns.some((column) => column.name === columnName);
  }

  private assertNoLegacySchema(): void {
    const hasLegacyProfilesTable = this.tableExists('profiles');
    const imagesUseLegacyProfileId = this.tableHasColumn('images', 'profile_id');

    if (!hasLegacyProfilesTable && !imagesUseLegacyProfileId) {
      return;
    }

    throw new Error('Legacy database schema detected. Delete the SQLite file and restart the app to rebuild the database with folders/folder_id tables.');
  }

  private applyCompatColumnMigrations(): void {
    if (this.tableExists('images') && !this.tableHasColumn('images', 'taken_at')) {
      this.database.exec('ALTER TABLE images ADD COLUMN taken_at INTEGER NULL');
    }

    if (this.tableExists('images') && !this.tableHasColumn('images', 'taken_at_source')) {
      this.database.exec('ALTER TABLE images ADD COLUMN taken_at_source TEXT NULL');
    }
  }

  private applyCompatIndexes(): void {
    this.database.exec('CREATE INDEX IF NOT EXISTS idx_images_taken_at ON images(taken_at DESC)');
    this.database.exec('CREATE INDEX IF NOT EXISTS idx_images_taken_at_source ON images(is_deleted, taken_at_source)');
  }
}

export const databaseManager = new DatabaseManager();
