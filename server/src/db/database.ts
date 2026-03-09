import { DatabaseSync } from 'node:sqlite';

import { appConfig, ensureRuntimeDirectories } from '../config/env.js';
import { schemaSql } from './schema.js';

class DatabaseManager {
  private database: DatabaseSync;

  constructor() {
    ensureRuntimeDirectories();
    this.database = new DatabaseSync(appConfig.databasePath);
    this.database.exec(schemaSql);
  }

  get connection(): DatabaseSync {
    return this.database;
  }
}

export const databaseManager = new DatabaseManager();
