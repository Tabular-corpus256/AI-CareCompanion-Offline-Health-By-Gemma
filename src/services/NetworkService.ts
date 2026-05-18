import { AppState, AppStateStatus } from 'react-native';
import NetInfo, { NetInfoState, NetInfoSubscription } from '@react-native-community/netinfo';

type SyncFn = (userId: string) => Promise<void>;

class NetworkServiceClass {
  private userId: string | null = null;
  private onSync: SyncFn | null = null;
  private onFlush: SyncFn | null = null;
  private periodicTimer: ReturnType<typeof setInterval> | null = null;
  private lastSyncAt = 0;
  private MIN_SYNC_INTERVAL = 60_000; // don't sync more than once per minute
  private appStateSub: ReturnType<typeof AppState.addEventListener> | null = null;
  private netInfoSub: NetInfoSubscription | null = null;
  private wasConnected: boolean | null = null;

  start(userId: string, onSync: SyncFn, onFlush: SyncFn) {
    this.userId = userId;
    this.onSync = onSync;
    this.onFlush = onFlush;

    // Use the subscription-based API (non-deprecated)
    this.appStateSub = AppState.addEventListener('change', this.handleAppState);

    // ── NetInfo: detect real network recovery ──────────────────────────────
    this.netInfoSub = NetInfo.addEventListener(this.handleNetInfoChange);

    // Flush outbox AND pull every 5 minutes while app is open
    this.periodicTimer = setInterval(() => {
      if (this.userId) {
        this.onFlush?.(this.userId).catch(() => {});
        this.onSync?.(this.userId).catch(() => {});
      }
    }, 5 * 60_000);
  }

  setUserId(id: string | null) {
    this.userId = id;
  }

  stop() {
    this.appStateSub?.remove();
    this.appStateSub = null;
    this.netInfoSub?.();
    this.netInfoSub = null;
    if (this.periodicTimer) {
      clearInterval(this.periodicTimer);
      this.periodicTimer = null;
    }
    this.wasConnected = null;
  }

  private handleAppState = (state: AppStateStatus) => {
    if (state !== 'active' || !this.userId) return;
    this.doSync();
  };

  /** Called by NetInfo whenever connectivity changes */
  private handleNetInfoChange = (state: NetInfoState) => {
    const isConnected = !!(state.isConnected && state.isInternetReachable !== false);

    // On first call just record the state — don't trigger sync
    if (this.wasConnected === null) {
      this.wasConnected = isConnected;
      return;
    }

    // Transition from offline → online: trigger full sync
    if (!this.wasConnected && isConnected && this.userId) {
      console.log('[NetworkService] Network recovered — triggering sync');
      this.doSync();
    }

    this.wasConnected = isConnected;
  };

  /** Shared sync logic with throttle guard */
  private doSync() {
    if (!this.userId) return;
    const now = Date.now();
    if (now - this.lastSyncAt < this.MIN_SYNC_INTERVAL) return;
    this.lastSyncAt = now;
    this.onFlush?.(this.userId).catch(() => {});
    this.onSync?.(this.userId).catch(() => {});
  }

  /** Call this after any write when the app is offline — the next foreground or network recovery will pick it up */
  triggerFlushWhenReady() {
    // No-op: handled by AppState + NetInfo listeners automatically
  }
}

export const NetworkService = new NetworkServiceClass();
