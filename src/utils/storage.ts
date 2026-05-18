import { DatabaseService } from '@services/DatabaseService';
import type { Message } from '@types';

const KEYS = {
  CHAT_MESSAGES: '@health_chat_messages',
  CHAT_HISTORY: '@health_chat_history',
  SYMPTOM_RESULT: '@health_symptom_result',
  DIET_RESULT: '@health_diet_result',
  EXERCISE_RESULT: '@health_exercise_result',
  TIPS_RESULT: '@health_tips_result',
  THEME_MODE: '@health_theme_mode',
} as const;

async function ensureInit(): Promise<void> {
  await DatabaseService.init();
}

export async function saveChatMessages(messages: Message[]): Promise<void> {
  await ensureInit();
  const db = DatabaseService.getDatabase();
  await db.transaction(async tx => {
    await tx.executeSql('DELETE FROM chat_messages');
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      await tx.executeSql(
        'INSERT INTO chat_messages (id, text, is_user, sort_order) VALUES (?, ?, ?, ?)',
        [msg.id, msg.text, msg.isUser ? 1 : 0, i],
      );
    }
  });
}

export async function loadChatMessages(): Promise<Message[]> {
  await ensureInit();
  const rows = await DatabaseService.query<any>(
    'SELECT id, text, is_user FROM chat_messages ORDER BY sort_order ASC',
  );
  return rows.map((r: any) => ({
    id: r.id,
    text: r.text,
    isUser: r.is_user === 1,
  }));
}

export async function clearChatMessages(): Promise<void> {
  await ensureInit();
  await DatabaseService.execute('DELETE FROM chat_messages');
}

export async function saveCachedResult(
  key: string,
  result: string,
): Promise<void> {
  await ensureInit();
  await DatabaseService.execute(
    'INSERT OR REPLACE INTO cached_results (key, result) VALUES (?, ?)',
    [key, result],
  );
}

export async function loadCachedResult(key: string): Promise<string | null> {
  await ensureInit();
  const rows = await DatabaseService.query<any>(
    'SELECT result FROM cached_results WHERE key = ?',
    [key],
  );
  return rows.length > 0 ? rows[0].result : null;
}

export async function saveModelInfo(key: string, value: string): Promise<void> {
  await ensureInit();
  await DatabaseService.execute(
    'INSERT OR REPLACE INTO model_info (key, value) VALUES (?, ?)',
    [key, value],
  );
}

export async function loadModelInfo(key: string): Promise<string | null> {
  await ensureInit();
  const rows = await DatabaseService.query<any>(
    'SELECT value FROM model_info WHERE key = ?',
    [key],
  );
  return rows.length > 0 ? rows[0].value : null;
}

export async function clearModelInfo(): Promise<void> {
  await ensureInit();
  await DatabaseService.execute('DELETE FROM model_info');
}

export async function saveThemeMode(mode: 'light' | 'dark'): Promise<void> {
  await ensureInit();
  await DatabaseService.execute(
    'INSERT OR REPLACE INTO user_preferences (key, value) VALUES (?, ?)',
    [KEYS.THEME_MODE, mode],
  );
}

export async function loadThemeMode(): Promise<'light' | 'dark' | null> {
  await ensureInit();
  const rows = await DatabaseService.query<any>(
    'SELECT value FROM user_preferences WHERE key = ?',
    [KEYS.THEME_MODE],
  );
  if (rows.length === 0) return null;
  const mode = rows[0].value;
  if (mode === 'light' || mode === 'dark') return mode;
  return null;
}

export const StorageKeys = KEYS;
