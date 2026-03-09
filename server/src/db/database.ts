import { DatabaseSync } from 'node:sqlite';

import { schemaSql } from './schema.js';
import { storageService } from '../services/storage-service.js';

class DatabaseManager {
  private database: DatabaseSync;

  constructor() {
    this.database = new DatabaseSync(storageService.getDatabasePath());
    this.database.exec(schemaSql);
  }

  get connection(): DatabaseSync {
    return this.database;
  }
}

export const databaseManager = new DatabaseManager();
