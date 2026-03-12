import { DatabaseSync } from 'node:sqlite';

import { schemaSql } from './schema.js';
import { storageService } from '../services/storage-service.js';

class DatabaseManager {
  private database: DatabaseSync;

  constructor() {
    this.database = new DatabaseSync(storageService.getDatabasePath());
    this.assertNoLegacySchema();
    this.database.exec(schemaSql);
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
}

export const databaseManager = new DatabaseManager();
