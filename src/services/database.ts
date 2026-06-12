import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, type SQLiteDBConnection } from '@capacitor-community/sqlite';
import type { AppState } from '../types';

const DATABASE_NAME = 'study_planner';
const STATE_KEY = 'application_state';
const BROWSER_KEY = 'ncism-study-planner-state';

class AppDatabase {
  private sqlite: SQLiteConnection | null = null;
  private db: SQLiteDBConnection | null = null;
  private initialized = false;

  private async initializeNative(): Promise<void> {
    if (this.initialized || !Capacitor.isNativePlatform()) return;

    this.sqlite = new SQLiteConnection(CapacitorSQLite);

    const consistency = await this.sqlite.checkConnectionsConsistency();
    const existing = await this.sqlite.isConnection(DATABASE_NAME, false);

    if (consistency.result && existing.result) {
      this.db = await this.sqlite.retrieveConnection(DATABASE_NAME, false);
    } else {
      this.db = await this.sqlite.createConnection(
        DATABASE_NAME,
        false,
        'no-encryption',
        1,
        false
      );
    }

    await this.db.open();
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS app_state (
        state_key TEXT PRIMARY KEY NOT NULL,
        state_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    this.initialized = true;
  }

  async load(): Promise<AppState | null> {
    if (!Capacitor.isNativePlatform()) {
      const raw = localStorage.getItem(BROWSER_KEY);
      return raw ? (JSON.parse(raw) as AppState) : null;
    }

    await this.initializeNative();
    const result = await this.db!.query(
      'SELECT state_json FROM app_state WHERE state_key = ? LIMIT 1;',
      [STATE_KEY]
    );

    const raw = result.values?.[0]?.state_json as string | undefined;
    return raw ? (JSON.parse(raw) as AppState) : null;
  }

  async save(state: AppState): Promise<void> {
    const serialized = JSON.stringify(state);

    if (!Capacitor.isNativePlatform()) {
      localStorage.setItem(BROWSER_KEY, serialized);
      return;
    }

    await this.initializeNative();
    await this.db!.run(
      `INSERT INTO app_state (state_key, state_json, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(state_key)
       DO UPDATE SET state_json = excluded.state_json, updated_at = excluded.updated_at;`,
      [STATE_KEY, serialized, new Date().toISOString()]
    );
  }

  async clear(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      localStorage.removeItem(BROWSER_KEY);
      return;
    }

    await this.initializeNative();
    await this.db!.run('DELETE FROM app_state WHERE state_key = ?;', [STATE_KEY]);
  }
}

export const appDatabase = new AppDatabase();
