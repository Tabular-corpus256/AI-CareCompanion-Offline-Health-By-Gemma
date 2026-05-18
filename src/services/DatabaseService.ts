import SQLite from 'react-native-sqlite-storage';
import {
  SEED_DRUGS,
  SEED_LAB_TESTS,
  SEED_SKIN_REMEDIES,
  SEED_HOSPITALS,
} from '../data/seedData';

SQLite.enablePromise(true);

const DB_NAME = 'healthai.db';

const SCHEMA_V1 = [
  `CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    text TEXT NOT NULL,
    is_user INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS user_preferences (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS cached_results (
    key TEXT PRIMARY KEY,
    result TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS model_info (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`,
];

const SCHEMA_V2 = [
  `CREATE TABLE IF NOT EXISTS patients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    age INTEGER,
    gender TEXT,
    village TEXT,
    user_id TEXT NOT NULL DEFAULT 'local',
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
  )`,
  `CREATE TABLE IF NOT EXISTS consultations (
    id TEXT PRIMARY KEY,
    patient_id TEXT,
    agent_id TEXT,
    user_input TEXT,
    ai_response TEXT,
    user_id TEXT NOT NULL DEFAULT 'local',
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER,
    FOREIGN KEY (patient_id) REFERENCES patients(id)
  )`,
  `CREATE TABLE IF NOT EXISTS drugs (
    name TEXT PRIMARY KEY,
    indication TEXT,
    dosage_adult TEXT,
    dosage_child TEXT,
    contraindications TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS lab_tests (
    test_name TEXT PRIMARY KEY,
    unit TEXT,
    normal_low REAL,
    normal_high REAL,
    interpretation_guide TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS skin_remedies (
    condition_keywords TEXT,
    natural_remedy TEXT,
    otc_cream TEXT,
    referral_flag INTEGER DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS hospitals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    district TEXT,
    distance_km REAL,
    phone TEXT,
    services TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS reminders (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    time TEXT NOT NULL,
    days TEXT,
    enabled INTEGER DEFAULT 1,
    user_id TEXT NOT NULL DEFAULT 'local',
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
  )`,
  `CREATE TABLE IF NOT EXISTS outbox (
    id TEXT PRIMARY KEY,
    operation TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    payload TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    attempts INTEGER DEFAULT 0,
    last_error TEXT,
    user_id TEXT NOT NULL DEFAULT 'local'
  )`,
  `CREATE TABLE IF NOT EXISTS sync_meta (
    key TEXT PRIMARY KEY,
    value TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL DEFAULT 'New Chat',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    agent_id TEXT NOT NULL DEFAULT 'orchestrator',
    user_id TEXT NOT NULL DEFAULT 'local',
    message_count INTEGER DEFAULT 0,
    last_preview TEXT DEFAULT ''
  )`,
  `CREATE TABLE IF NOT EXISTS agent_chat_history (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL DEFAULT 'default',
    agent_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    user_id TEXT NOT NULL DEFAULT 'local',
    image_uri TEXT,
    image_mime_type TEXT,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id)
  )`,
  `CREATE TABLE IF NOT EXISTS medications (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    dosage TEXT,
    frequency TEXT,
    indication TEXT,
    start_date INTEGER,
    end_date INTEGER,
    reminder_enabled INTEGER DEFAULT 0,
    reminder_times TEXT DEFAULT '[]',
    notes TEXT DEFAULT '',
    user_id TEXT NOT NULL DEFAULT 'local',
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
  )`,
  `CREATE TABLE IF NOT EXISTS health_metrics (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    value TEXT NOT NULL,
    unit TEXT DEFAULT '',
    recorded_at INTEGER NOT NULL,
    notes TEXT DEFAULT '',
    user_id TEXT NOT NULL DEFAULT 'local'
  )`,
];

const SCHEMA_V3 = [
  `CREATE TABLE IF NOT EXISTS place_searches (
    id TEXT PRIMARY KEY,
    query TEXT NOT NULL,
    user_lat REAL NOT NULL,
    user_lng REAL NOT NULL,
    result_count INTEGER DEFAULT 0,
    success INTEGER DEFAULT 1,
    error_msg TEXT,
    searched_at INTEGER NOT NULL,
    user_id TEXT NOT NULL DEFAULT 'local'
  )`,
];

const SCHEMA_V4 = [
  `CREATE TABLE IF NOT EXISTS recommendation_cards (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    sub TEXT NOT NULL DEFAULT '',
    icon TEXT NOT NULL DEFAULT 'medical',
    bg_color TEXT NOT NULL DEFAULT '#0D7C66',
    text_color TEXT NOT NULL DEFAULT '#FFFFFF',
    accent_color TEXT NOT NULL DEFAULT '#1DB589',
    agent_id TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    steps TEXT NOT NULL DEFAULT '[]',
    created_at INTEGER NOT NULL,
    user_id TEXT NOT NULL DEFAULT 'local'
  )`,
];

const SCHEMA_V5 = [
  `CREATE TABLE IF NOT EXISTS drug_search_history (
    id TEXT PRIMARY KEY,
    query TEXT NOT NULL,
    result_count INTEGER DEFAULT 0,
    searched_at INTEGER NOT NULL,
    user_id TEXT NOT NULL DEFAULT 'local'
  )`,
];

const SCHEMA_V7 = [
  `CREATE TABLE IF NOT EXISTS chat_reports (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'both',
    title TEXT NOT NULL DEFAULT 'Health Report',
    content_clinical TEXT NOT NULL DEFAULT '[]',
    content_patient TEXT NOT NULL DEFAULT '[]',
    pdf_path TEXT,
    message_count INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    user_id TEXT NOT NULL DEFAULT 'local',
    FOREIGN KEY (conversation_id) REFERENCES conversations(id)
  )`,
];

const SCHEMA_V6 = [
  `CREATE TABLE IF NOT EXISTS image_analyses (
    id TEXT PRIMARY KEY,
    local_uri TEXT NOT NULL,
    analysis_type TEXT NOT NULL,
    type_label TEXT NOT NULL,
    type_color TEXT NOT NULL DEFAULT '#0D7C66',
    user_prompt TEXT NOT NULL DEFAULT '',
    ai_response TEXT NOT NULL DEFAULT '',
    timestamp INTEGER NOT NULL,
    user_id TEXT NOT NULL DEFAULT 'local'
  )`,
];

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

class DatabaseServiceClass {
  private db: SQLite.SQLiteDatabase | null = null;
  private initPromise: Promise<void> | null = null;
  private currentUserId: string = 'local';

  setCurrentUserId(userId: string | null): void {
    this.currentUserId = userId || 'local';
  }

  getCurrentUserId(): string {
    return this.currentUserId;
  }

  async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      console.log('[DatabaseService] init() starting...');
      console.log(
        '[DatabaseService] SQLite.openDatabase type:',
        typeof SQLite.openDatabase,
      );
      if (typeof SQLite.openDatabase !== 'function') {
        console.error(
          '[DatabaseService] SQLite.openDatabase is not a function! react-native-sqlite-storage may not be linked.',
        );
        throw new Error(
          'SQLite module not available. Please run: cd android && ./gradlew clean && cd .. && npm run android',
        );
      }
      this.db = await SQLite.openDatabase({
        name: DB_NAME,
        location: 'default',
      });
      console.log('[DatabaseService] DB opened successfully');

      for (const stmt of SCHEMA_V1) {
        await this.db.executeSql(stmt);
      }
      for (const stmt of SCHEMA_V2) {
        await this.db.executeSql(stmt);
      }
      for (const stmt of SCHEMA_V3) {
        await this.db.executeSql(stmt);
      }
      for (const stmt of SCHEMA_V4) {
        await this.db.executeSql(stmt);
      }
      for (const stmt of SCHEMA_V5) {
        await this.db.executeSql(stmt);
      }
      for (const stmt of SCHEMA_V6) {
        await this.db.executeSql(stmt);
      }
      for (const stmt of SCHEMA_V7) {
        await this.db.executeSql(stmt);
      }

      try {
        await this.execute(
          `ALTER TABLE agent_chat_history ADD COLUMN image_uri TEXT`,
        );
      } catch {}
      try {
        await this.execute(
          `ALTER TABLE agent_chat_history ADD COLUMN image_mime_type TEXT`,
        );
      } catch {}

      await this.seedIfEmpty();
    })();

    await this.initPromise;
  }

  getDatabase(): SQLite.SQLiteDatabase {
    if (!this.db)
      throw new Error('Database not initialized. Call init() first.');
    return this.db;
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }

  async query<T = Record<string, unknown>>(
    sql: string,
    params: any[] = [],
  ): Promise<T[]> {
    const db = this.getDatabase();
    console.log('[DatabaseService] query executing:', sql.substring(0, 60));
    const result = await db.executeSql(sql, params);
    console.log(
      '[DatabaseService] query result type:',
      typeof result,
      'isArray:',
      Array.isArray(result),
    );
    const results = Array.isArray(result) ? result[0] : result;
    console.log(
      '[DatabaseService] results.rows exists:',
      !!results?.rows,
      'length:',
      results?.rows?.length,
    );
    const rows: T[] = [];
    const len = results?.rows?.length ?? 0;
    for (let i = 0; i < len; i++) {
      if (typeof results.rows.item === 'function') {
        rows.push(results.rows.item(i));
      } else if (results.rows.raw) {
        const raw = results.rows.raw();
        rows.push(raw[i]);
      } else {
        rows.push((results.rows as any)[i]);
      }
    }
    console.log('[DatabaseService] query returning', rows.length, 'rows');
    return rows;
  }

  async queryFirst<T = Record<string, unknown>>(
    sql: string,
    params: any[] = [],
  ): Promise<T | null> {
    const rows = await this.query<T>(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  async execute(sql: string, params: any[] = []): Promise<void> {
    const db = this.getDatabase();
    await db.executeSql(sql, params);
  }

  async transaction(
    fn: (tx: SQLite.Transaction) => Promise<void>,
  ): Promise<void> {
    const db = this.getDatabase();
    await db.transaction((tx: SQLite.Transaction) => {
      fn(tx).then(
        () => undefined,
        err => {
          throw err;
        },
      );
    });
  }

  uuid(): string {
    return generateUUID();
  }

  now(): number {
    return Date.now();
  }

  private async seedIfEmpty(): Promise<void> {
    const db = this.getDatabase();

    const drugCount = await this.queryFirst<{ cnt: number }>(
      'SELECT COUNT(*) as cnt FROM drugs',
    );
    if (!drugCount || drugCount.cnt === 0) {
      for (const d of SEED_DRUGS) {
        await db.executeSql(
          'INSERT OR IGNORE INTO drugs (name, indication, dosage_adult, dosage_child, contraindications) VALUES (?, ?, ?, ?, ?)',
          [
            d.name,
            d.indication,
            d.dosage_adult,
            d.dosage_child,
            d.contraindications,
          ],
        );
      }
    }

    const labCount = await this.queryFirst<{ cnt: number }>(
      'SELECT COUNT(*) as cnt FROM lab_tests',
    );
    if (!labCount || labCount.cnt === 0) {
      for (const lt of SEED_LAB_TESTS) {
        await db.executeSql(
          'INSERT OR IGNORE INTO lab_tests (test_name, unit, normal_low, normal_high, interpretation_guide) VALUES (?, ?, ?, ?, ?)',
          [
            lt.test_name,
            lt.unit,
            lt.normal_low,
            lt.normal_high,
            lt.interpretation_guide,
          ],
        );
      }
    }

    const skinCount = await this.queryFirst<{ cnt: number }>(
      'SELECT COUNT(*) as cnt FROM skin_remedies',
    );
    if (!skinCount || skinCount.cnt === 0) {
      for (const sr of SEED_SKIN_REMEDIES) {
        await db.executeSql(
          'INSERT OR IGNORE INTO skin_remedies (condition_keywords, natural_remedy, otc_cream, referral_flag) VALUES (?, ?, ?, ?)',
          [
            sr.condition_keywords,
            sr.natural_remedy,
            sr.otc_cream,
            sr.referral_flag,
          ],
        );
      }
    }

    const hospCount = await this.queryFirst<{ cnt: number }>(
      'SELECT COUNT(*) as cnt FROM hospitals',
    );
    if (!hospCount || hospCount.cnt === 0) {
      for (const h of SEED_HOSPITALS) {
        await db.executeSql(
          'INSERT OR IGNORE INTO hospitals (name, district, distance_km, phone, services) VALUES (?, ?, ?, ?, ?)',
          [h.name, h.district, h.distance_km, h.phone, h.services],
        );
      }
    }
  }
}

export const DatabaseService = new DatabaseServiceClass();
