import { GoogleGenAI } from '@google/genai';
import { GEMINI_API_KEY } from '@env';
import { DatabaseService } from './DatabaseService';

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

export interface DynamicRecommendation {
  id?: string;
  title: string;
  sub: string;
  icon: string;
  bgColor: string;
  textColor: string;
  accentColor: string;
  agentId?: string;
  description?: string;
  steps?: string[];
  createdAt?: number;
}

export interface CardRow {
  id: string;
  title: string;
  sub: string;
  icon: string;
  bg_color: string;
  text_color: string;
  accent_color: string;
  agent_id: string;
  description: string;
  steps: string;
  created_at: number;
  user_id: string;
}

function rowToRec(row: CardRow): DynamicRecommendation {
  return {
    id: row.id,
    title: row.title,
    sub: row.sub,
    icon: row.icon,
    bgColor: row.bg_color,
    textColor: row.text_color,
    accentColor: row.accent_color,
    agentId: row.agent_id || undefined,
    description: row.description || undefined,
    steps: row.steps ? JSON.parse(row.steps) : undefined,
    createdAt: row.created_at,
  };
}

class RecommendationServiceClass {
  /** Returns the most recent cards within TTL — used by HomeScreen to skip LLM call */
  async getCachedRecommendations(userId: string): Promise<DynamicRecommendation[] | null> {
    try {
      await DatabaseService.init();
      const since = Date.now() - CACHE_TTL_MS;
      const rows = await DatabaseService.query<CardRow>(
        'SELECT * FROM recommendation_cards WHERE user_id = ? AND created_at > ? ORDER BY created_at DESC LIMIT 3',
        [userId, since],
      );
      if (rows.length === 0) return null;
      return rows.map(rowToRec);
    } catch {
      return null;
    }
  }

  /** Paginated search query for the dedicated Recommendations screen */
  async getAllCards(
    userId: string,
    opts: { search?: string; limit?: number; offset?: number } = {},
  ): Promise<DynamicRecommendation[]> {
    await DatabaseService.init();
    const { search = '', limit = 30, offset = 0 } = opts;
    const rows = search.trim()
      ? await DatabaseService.query<CardRow>(
          `SELECT * FROM recommendation_cards
           WHERE user_id = ? AND (title LIKE ? OR description LIKE ? OR sub LIKE ?)
           ORDER BY created_at DESC LIMIT ? OFFSET ?`,
          [userId, `%${search}%`, `%${search}%`, `%${search}%`, limit, offset],
        )
      : await DatabaseService.query<CardRow>(
          `SELECT * FROM recommendation_cards WHERE user_id = ?
           ORDER BY created_at DESC LIMIT ? OFFSET ?`,
          [userId, limit, offset],
        );
    return rows.map(rowToRec);
  }

  /** Called after each AI response — fire-and-forget from ChatScreen */
  async extractAndCache(aiResponseText: string, userId: string): Promise<void> {
    if (!aiResponseText || aiResponseText.length < 80) return;
    try {
      const recs = await this.extractRecommendations(aiResponseText);
      if (!recs || recs.length === 0) return;
      await this.insertCards(userId, recs);
    } catch (e) {
      console.warn('[RecommendationService] extractAndCache failed:', e);
    }
  }

  /** Public — used by HomeScreen LLM fallback after it generates cards */
  async cacheRecommendations(userId: string, recs: DynamicRecommendation[]): Promise<void> {
    await this.insertCards(userId, recs);
  }

  private async extractRecommendations(text: string): Promise<DynamicRecommendation[]> {
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const prompt = `From this health AI response, extract up to 3 actionable health recommendations as a JSON array. Each item must have: title (max 8 words), sub (max 4 words e.g. "7 day plan"), icon (one of: heart, pulse, nutrition, brain, moon, fitness-center, self-improvement, medical, spa, eco, healing), bgColor (hex), textColor (hex with good contrast against bgColor), accentColor (hex), agentId (one of: general_practice, nutrition_dietetics, pulmonology, psychiatry, cardiology, dermatology, neurology, paediatrics, sleep_medicine), description (2-3 sentences of concrete personalized health advice), steps (array of 3-4 action items max 10 words each). If the response has no health advice, return []. Output ONLY the JSON array.\n\nResponse:\n${text.slice(0, 1200)}`;
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });
    const raw = response.text ?? '';
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) return [];
    const parsed = JSON.parse(match[0]) as DynamicRecommendation[];
    return Array.isArray(parsed) ? parsed.slice(0, 3) : [];
  }

  private async insertCards(userId: string, recs: DynamicRecommendation[]): Promise<void> {
    await DatabaseService.init();
    const now = Date.now();
    for (const rec of recs) {
      const id = DatabaseService.uuid();
      await DatabaseService.execute(
        `INSERT INTO recommendation_cards
          (id, title, sub, icon, bg_color, text_color, accent_color, agent_id, description, steps, created_at, user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          rec.title,
          rec.sub ?? '',
          rec.icon ?? 'medical',
          rec.bgColor ?? '#0D7C66',
          rec.textColor ?? '#FFFFFF',
          rec.accentColor ?? '#1DB589',
          rec.agentId ?? '',
          rec.description ?? '',
          JSON.stringify(rec.steps ?? []),
          now,
          userId,
        ],
      );
      this.syncCardToFirestore(userId, id, rec, now).catch(() => {});
    }
    console.log(`[RecommendationService] Inserted ${recs.length} cards for user ${userId}`);
  }

  private async syncCardToFirestore(
    userId: string,
    id: string,
    rec: DynamicRecommendation,
    createdAt: number,
  ): Promise<void> {
    // Use SyncService.pushEntity for automatic outbox fallback when offline
    const { SyncService } = require('./FirebaseService');
    await SyncService.pushEntity(userId, 'recommendation_cards', id, {
      title: rec.title,
      sub: rec.sub ?? '',
      icon: rec.icon ?? 'medical',
      bgColor: rec.bgColor ?? '#0D7C66',
      textColor: rec.textColor ?? '#FFFFFF',
      accentColor: rec.accentColor ?? '#1DB589',
      agentId: rec.agentId ?? '',
      description: rec.description ?? '',
      steps: rec.steps ?? [],
      createdAt,
    });
  }

  async invalidateCache(_userId: string): Promise<void> {
    // No-op: individual rows are not bulk-invalidated; TTL handled per-query
  }
}

export const RecommendationService = new RecommendationServiceClass();
export default RecommendationService;
