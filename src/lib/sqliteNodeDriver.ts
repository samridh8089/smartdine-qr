/**
 * SmartDine Node.js & Desktop Native SQLite Driver
 * Powered by Node.js built-in DatabaseSync (node:sqlite)
 */

import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import type { SQLiteDriver } from './offlineSyncEngine';

export class NodeSQLiteDriver implements SQLiteDriver {
  private db: DatabaseSync;

  constructor(filePath = ':memory:') {
    if (filePath !== ':memory:') {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
    this.db = new DatabaseSync(filePath);
  }

  exec(sql: string): void {
    this.db.exec(sql);
  }

  run(sql: string, params: any[] = []): { changes: number; lastInsertRowId?: any } {
    const stmt = this.db.prepare(sql);
    const info = stmt.run(...params);
    return { changes: Number(info.changes), lastInsertRowId: info.lastInsertRowid };
  }

  get<T = any>(sql: string, params: any[] = []): T | undefined {
    const stmt = this.db.prepare(sql);
    return stmt.get(...params) as T | undefined;
  }

  all<T = any>(sql: string, params: any[] = []): T[] {
    const stmt = this.db.prepare(sql);
    return stmt.all(...params) as T[];
  }
}
