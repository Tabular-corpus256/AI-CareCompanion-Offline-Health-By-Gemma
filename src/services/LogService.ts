import { DatabaseService } from './DatabaseService';

export interface PlaceSearchLog {
  id: string;
  query: string;
  user_lat: number;
  user_lng: number;
  result_count: number;
  success: boolean;
  error_msg?: string;
  searched_at: number;
}

class LogServiceClass {
  async logPlaceSearch(params: {
    query: string;
    lat: number;
    lng: number;
    resultCount: number;
    error?: string;
  }): Promise<void> {
    try {
      await DatabaseService.init();
      const id = DatabaseService.uuid();
      const now = DatabaseService.now();
      const success = !params.error ? 1 : 0;
      await DatabaseService.execute(
        `INSERT INTO place_searches
          (id, query, user_lat, user_lng, result_count, success, error_msg, searched_at, user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          params.query,
          params.lat,
          params.lng,
          params.resultCount,
          success,
          params.error ?? null,
          now,
          DatabaseService.getCurrentUserId(),
        ],
      );
      console.log(
        `[LogService] place_search logged — query="${params.query}" results=${params.resultCount} ` +
        `lat=${params.lat.toFixed(5)} lng=${params.lng.toFixed(5)}`,
      );
    } catch (e) {
      console.warn('[LogService] Failed to log place search:', e);
    }
  }

  async getRecentPlaceSearches(limit = 20): Promise<PlaceSearchLog[]> {
    try {
      await DatabaseService.init();
      return await DatabaseService.query<PlaceSearchLog>(
        `SELECT * FROM place_searches ORDER BY searched_at DESC LIMIT ?`,
        [limit],
      );
    } catch {
      return [];
    }
  }
}

export const LogService = new LogServiceClass();
export default LogService;
