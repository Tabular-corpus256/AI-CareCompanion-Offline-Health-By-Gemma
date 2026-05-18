import SQLite from 'react-native-sqlite-storage';
import { DatabaseService } from './DatabaseService';

export interface DrugInfo {
  name: string;
  brandName?: string;
  activeIngredient?: string;
  dosageForm?: string;
  administrationRoute?: string;
  prescriptionStatus?: string;
  pregnancyWarning?: string;
  alcoholWarning?: string;
  breastfeedingWarning?: string;
  foodWarning?: string;
  mechanismOfAction?: string;
  availableStrength?: string;
  doseSchedule?: string;
}

export interface DrugSearchEntry {
  id: string;
  query: string;
  resultCount: number;
  searchedAt: number;
}

class DrugInfoServiceClass {
  private db: SQLite.SQLiteDatabase | null = null;
  private dbAvailable = false;
  private openAttempted = false;

  private async openDb(): Promise<void> {
    if (this.openAttempted) return;
    this.openAttempted = true;
    try {
      // Android: place 1mg_medicines.db in android/app/src/main/assets/
      // iOS: add to Xcode bundle resources
      this.db = await SQLite.openDatabase({
        name: '1mg_medicines.db',
        createFromLocation: 1,
        location: 'default',
      } as any);
      this.dbAvailable = true;
      console.log('[DrugInfoService] 1mg DB opened');
    } catch (e) {
      console.warn(
        '[DrugInfoService] Cannot open 1mg DB (file not in assets yet?):',
        e,
      );
      this.dbAvailable = false;
    }
  }

  get isAvailable(): boolean {
    return this.dbAvailable;
  }

  async searchDrugs(query: string, limit = 30): Promise<DrugInfo[]> {
    await this.openDb();
    if (!query.trim()) return [];

    // ── 1mg DB (rich data) ───────────────────────────────────────────────────
    if (this.db && this.dbAvailable) {
      const like = `%${query.trim()}%`;
      const startLike = `${query.trim()}%`;
      try {
        const result = await this.db.executeSql(
          `SELECT name, brand_name, active_ingredient, dosage_form, administration_route,
                  prescription_status, pregnancy_warning, alcohol_warning, breastfeeding_warning,
                  food_warning, mechanism_of_action, available_strength, dose_schedule
           FROM medicines
           WHERE name LIKE ? OR brand_name LIKE ? OR active_ingredient LIKE ?
           ORDER BY
             CASE WHEN LOWER(name) LIKE LOWER(?) THEN 0
                  WHEN LOWER(brand_name) LIKE LOWER(?) THEN 1
                  ELSE 2 END,
             name ASC
           LIMIT ?`,
          [like, like, like, startLike, startLike, limit],
        );
        const rows = Array.isArray(result) ? result[0] : result;
        const items: DrugInfo[] = [];
        const len = rows?.rows?.length ?? 0;
        for (let i = 0; i < len; i++) {
          const row =
            typeof rows.rows.item === 'function'
              ? rows.rows.item(i)
              : (rows.rows as any)[i];
          items.push({
            name: row.name ?? '',
            brandName: row.brand_name || undefined,
            activeIngredient: row.active_ingredient || undefined,
            dosageForm: row.dosage_form || undefined,
            administrationRoute: row.administration_route || undefined,
            prescriptionStatus: row.prescription_status || undefined,
            pregnancyWarning: row.pregnancy_warning || undefined,
            alcoholWarning: row.alcohol_warning || undefined,
            breastfeedingWarning: row.breastfeeding_warning || undefined,
            foodWarning: row.food_warning || undefined,
            mechanismOfAction: row.mechanism_of_action || undefined,
            availableStrength: row.available_strength || undefined,
            doseSchedule: row.dose_schedule || undefined,
          });
        }
        if (items.length > 0) return items;
      } catch (e) {
        console.warn('[DrugInfoService] 1mg search error:', e);
      }
    }

    // ── Fallback: main app drugs table (seeded basic data) ──────────────────
    try {
      await DatabaseService.init();
      const like = `%${query.trim()}%`;
      const rows = await DatabaseService.query<{
        name: string;
        indication: string;
        dosage_adult: string;
        dosage_child: string;
        contraindications: string;
      }>(
        'SELECT name, indication, dosage_adult, dosage_child, contraindications FROM drugs WHERE name LIKE ? ORDER BY name ASC LIMIT ?',
        [like, limit],
      );
      return rows.map(r => ({
        name: r.name,
        mechanismOfAction: r.indication || undefined,
        doseSchedule: r.dosage_adult || undefined,
        availableStrength: r.contraindications || undefined,
      }));
    } catch (e) {
      console.warn('[DrugInfoService] fallback search error:', e);
      return [];
    }
  }

  async saveSearch(
    userId: string,
    query: string,
    count: number,
  ): Promise<void> {
    try {
      await DatabaseService.init();
      const id = DatabaseService.uuid();
      await DatabaseService.execute(
        `INSERT INTO drug_search_history (id, query, result_count, searched_at, user_id)
         VALUES (?, ?, ?, ?, ?)`,
        [id, query.trim(), count, Date.now(), userId],
      );
      // keep only 30 most recent
      await DatabaseService.execute(
        `DELETE FROM drug_search_history WHERE user_id = ? AND id NOT IN (
           SELECT id FROM drug_search_history WHERE user_id = ? ORDER BY searched_at DESC LIMIT 30
         )`,
        [userId, userId],
      );
    } catch {}
  }

  async getHistory(userId: string): Promise<DrugSearchEntry[]> {
    try {
      await DatabaseService.init();
      const rows = await DatabaseService.query<{
        id: string;
        query: string;
        result_count: number;
        searched_at: number;
      }>(
        `SELECT MAX(id) as id, query, MAX(result_count) as result_count, MAX(searched_at) as searched_at
         FROM drug_search_history
         WHERE user_id = ?
         GROUP BY LOWER(query)
         ORDER BY MAX(searched_at) DESC
         LIMIT 12`,
        [userId],
      );
      return rows.map(r => ({
        id: r.id,
        query: r.query,
        resultCount: r.result_count,
        searchedAt: r.searched_at,
      }));
    } catch {
      return [];
    }
  }

  async deleteHistoryEntry(id: string): Promise<void> {
    try {
      await DatabaseService.init();
      await DatabaseService.execute(
        'DELETE FROM drug_search_history WHERE id = ?',
        [id],
      );
    } catch {}
  }

  async clearHistory(userId: string): Promise<void> {
    try {
      await DatabaseService.init();
      await DatabaseService.execute(
        'DELETE FROM drug_search_history WHERE user_id = ?',
        [userId],
      );
    } catch {}
  }
}

export const DrugInfoService = new DrugInfoServiceClass();
