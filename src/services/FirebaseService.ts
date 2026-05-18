import { getAuth, FirebaseAuthTypes } from '@react-native-firebase/auth';
import {
  collection,
  doc,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  setDoc,
  where,
} from '@react-native-firebase/firestore';
import { DatabaseService } from './DatabaseService';
import { logError, logWarn } from '@utils/logger';

const auth = getAuth();
const firestore = getFirestore();

// ─── Auth ──────────────────────────────────────────────────────────────────

class AuthError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
  }
}

function mapAuthError(code: string): string {
  switch (code) {
    case 'auth/email-already-in-use': return 'This email is already registered. Try signing in instead.';
    case 'auth/invalid-email': return 'Please enter a valid email address.';
    case 'auth/weak-password': return 'Password must be at least 6 characters.';
    case 'auth/user-not-found': return 'No account found with this email. Sign up first.';
    case 'auth/wrong-password': return 'Incorrect password. Please try again.';
    case 'auth/too-many-requests': return 'Too many failed attempts. Please try again later.';
    case 'auth/network-request-failed': return 'Network error. Check your internet connection.';
    case 'auth/operation-not-allowed': return 'Email/password sign-in is not enabled in Firebase Console.';
    case 'auth/user-disabled': return 'This account has been disabled. Contact support.';
    case 'auth/invalid-credential': return 'Invalid credentials. Please check your email and password.';
    case 'auth/account-exists-with-different-credential': return 'An account already exists with the same email using a different sign-in method.';
    case 'auth/requires-recent-login': return 'This operation requires recent authentication. Please sign in again.';
    case 'auth/provider-already-linked': return 'This account is already linked to that provider.';
    case 'auth/credential-already-in-use': return 'These credentials are already associated with a different account.';
    default: return `Authentication failed (${code}). Please try again.`;
  }
}

class AuthServiceClass {
  async init() {
    try { return auth.currentUser; } catch (err) { logError('AuthService.init failed', err); return null; }
  }

  onAuthStateChange(callback: (user: FirebaseAuthTypes.User | null) => void): () => void {
    return auth.onAuthStateChanged(user => callback(user || null));
  }

  getCurrentUser() { return auth.currentUser; }

  async signInWithEmail(email: string, password: string) {
    try { return await auth.signInWithEmailAndPassword(email, password); }
    catch (e: any) { const code = e?.code || 'auth/unknown'; logError('signInWithEmail failed', e); throw new AuthError(code, mapAuthError(code)); }
  }

  async signUpWithEmail(email: string, password: string, displayName?: string) {
    if (password.length < 6) throw new AuthError('auth/weak-password', 'Password must be at least 6 characters.');
    try {
      const cred = await auth.createUserWithEmailAndPassword(email, password);
      if (displayName) {
        try { await cred.user.updateProfile({ displayName }); } catch {}
      }
      await cred.user.sendEmailVerification();
      return cred;
    }
    catch (e: any) { const code = e?.code || 'auth/unknown'; logError('signUpWithEmail failed', e); throw new AuthError(code, mapAuthError(code)); }
  }

  async resendVerificationEmail() {
    const user = auth.currentUser;
    if (user && !user.emailVerified) await user.sendEmailVerification();
  }

  async isEmailVerified(): Promise<boolean> {
    await auth.currentUser?.reload();
    return auth.currentUser?.emailVerified ?? false;
  }

  async sendPasswordResetEmail(email: string) {
    try { await auth.sendPasswordResetEmail(email); }
    catch (e: any) { const code = e?.code || 'auth/unknown'; logError('sendPasswordResetEmail failed', e); throw new AuthError(code, mapAuthError(code)); }
  }

  async signOut() { return auth.signOut(); }
  get userId(): string | undefined { return auth.currentUser?.uid; }
  get isSignedIn(): boolean { try { return auth.currentUser !== null; } catch { return false; } }
}

export const AuthService = new AuthServiceClass();

// ─── Sync ──────────────────────────────────────────────────────────────────

const SYNC_LIMIT = 200; // max docs pulled per entity per sync

class SyncServiceClass {
  // ── Timestamps ────────────────────────────────────────────────────────────

  private tsCache: Record<string, number> = {};

  private tsKey(userId: string, entity: string) {
    return `last_sync_${entity}_${userId}`;
  }

  private async getTs(userId: string, entity: string): Promise<number> {
    const k = this.tsKey(userId, entity);
    if (this.tsCache[k] !== undefined) return this.tsCache[k];
    try {
      const row = await DatabaseService.queryFirst<{ value: string }>(
        'SELECT value FROM sync_meta WHERE key = ?', [k],
      );
      const ts = parseInt(row?.value ?? '0', 10) || 0;
      this.tsCache[k] = ts;
      return ts;
    } catch { return 0; }
  }

  private async setTs(userId: string, entity: string, ts: number) {
    const k = this.tsKey(userId, entity);
    this.tsCache[k] = ts;
    try {
      await DatabaseService.execute(
        'INSERT OR REPLACE INTO sync_meta (key, value) VALUES (?, ?)', [k, String(ts)],
      );
    } catch {}
  }

  // ── Pull helpers ──────────────────────────────────────────────────────────

  private async pullCollection(
    userId: string,
    entity: string,
    fsCollection: string,
    upsertRow: (id: string, data: Record<string, any>) => Promise<void>,
  ): Promise<number> {
    try {
      const since = await this.getTs(userId, entity);
      const colRef = collection(firestore, `users/${userId}/${fsCollection}`);
      const q = query(colRef, where('updatedAt', '>', since), orderBy('updatedAt'), limit(SYNC_LIMIT));
      const snap = await getDocs(q);
      if (snap.empty) return 0;
      for (const d of snap.docs) {
        try { await upsertRow(d.id, d.data() as Record<string, any>); } catch {}
      }
      const latest = snap.docs[snap.docs.length - 1].data().updatedAt as number;
      if (latest) await this.setTs(userId, entity, latest);
      console.log(`[SyncService] pulled ${snap.size} ${entity}`);
      return snap.size;
    } catch (e) {
      logWarn('SyncService', `pullCollection(${entity}) failed`, { error: e });
      return 0;
    }
  }

  // ── Entity pulls ──────────────────────────────────────────────────────────

  private async pullConversations(userId: string) {
    await this.pullCollection(userId, 'conversations', 'conversations', async (id, d) => {
      await DatabaseService.execute(
        `INSERT OR REPLACE INTO conversations
           (id, title, created_at, updated_at, agent_id, user_id, message_count, last_preview)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, d.title ?? 'New Chat', d.createdAt ?? d.updatedAt, d.updatedAt, d.agentId ?? 'orchestrator', userId, d.messageCount ?? 0, d.lastPreview ?? ''],
      );
    });
  }

  private async pullChatHistory(userId: string) {
    await this.pullCollection(userId, 'messages', 'messages', async (id, d) => {
      await DatabaseService.execute(
        `INSERT OR REPLACE INTO agent_chat_history
           (id, conversation_id, agent_id, role, content, timestamp, user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, d.conversationId ?? 'default', d.agentId ?? 'orchestrator', d.role, d.content, d.timestamp, userId],
      );
    });
  }

  private async pullMedications(userId: string) {
    await this.pullCollection(userId, 'medications', 'medications', async (id, d) => {
      if (d.deletedAt) {
        await DatabaseService.execute(
          'UPDATE medications SET deleted_at = ? WHERE id = ?', [d.deletedAt, id],
        );
      } else {
        await DatabaseService.execute(
          `INSERT OR REPLACE INTO medications
             (id, name, dosage, frequency, indication, start_date, end_date,
              reminder_enabled, reminder_times, notes, user_id, updated_at, deleted_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
          [id, d.name ?? '', d.dosage ?? '', d.frequency ?? '', d.indication ?? '',
           d.startDate ?? null, d.endDate ?? null, d.reminderEnabled ? 1 : 0,
           JSON.stringify(d.reminderTimes ?? []), d.notes ?? '', userId, d.updatedAt],
        );
      }
    });
  }

  private async pullHealthMetrics(userId: string) {
    await this.pullCollection(userId, 'health_metrics', 'health_metrics', async (id, d) => {
      await DatabaseService.execute(
        `INSERT OR REPLACE INTO health_metrics
           (id, type, value, unit, recorded_at, notes, user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, d.type, d.value, d.unit ?? '', d.recordedAt ?? d.updatedAt, d.notes ?? '', userId],
      );
    });
  }

  private async pullReminders(userId: string) {
    await this.pullCollection(userId, 'reminders', 'reminders', async (id, d) => {
      if (d.deletedAt) {
        await DatabaseService.execute(
          'UPDATE reminders SET deleted_at = ? WHERE id = ?', [d.deletedAt, id],
        );
      } else {
        await DatabaseService.execute(
          `INSERT OR REPLACE INTO reminders
             (id, type, title, time, days, enabled, user_id, updated_at, deleted_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
          [id, d.type ?? 'medication', d.title ?? '', d.time ?? '',
           d.days ?? '', d.enabled ? 1 : 0, userId, d.updatedAt],
        );
      }
    });
  }

  private async pullRecommendationCards(userId: string) {
    await this.pullCollection(userId, 'recommendation_cards', 'recommendation_cards', async (id, d) => {
      await DatabaseService.execute(
        `INSERT OR REPLACE INTO recommendation_cards
           (id, title, sub, icon, bg_color, text_color, accent_color,
            agent_id, description, steps, created_at, user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, d.title ?? '', d.sub ?? '', d.icon ?? 'medical',
         d.bgColor ?? '#0D7C66', d.textColor ?? '#FFFFFF', d.accentColor ?? '#1DB589',
         d.agentId ?? '', d.description ?? '', JSON.stringify(d.steps ?? []),
         d.createdAt ?? d.updatedAt, userId],
      );
    });
  }

  private async pullProfile(userId: string) {
    try {
      const colRef = collection(firestore, `users/${userId}/profile`);
      const snap = await getDocs(colRef);
      if (snap.empty) return;
      for (const d of snap.docs) {
        if (d.id === 'health_profile') {
          const data = d.data() as Record<string, any>;
          // Remove Firestore metadata fields before storing locally
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { updatedAt, deletedAt, ...profileData } = data;
          await DatabaseService.execute(
            "INSERT OR REPLACE INTO user_preferences (key, value) VALUES ('health_profile', ?)",
            [JSON.stringify(profileData)],
          );
          console.log('[SyncService] pulled health_profile from Firestore');
        }
      }
    } catch (e) {
      logWarn('SyncService', 'pullProfile failed', { error: e });
    }
  }

  /** Pull all entities — safe to call on login and on foreground */
  async syncAll(userId: string): Promise<void> {
    await this.pullConversations(userId);
    await this.pullChatHistory(userId);
    await this.pullMedications(userId);
    await this.pullHealthMetrics(userId);
    await this.pullReminders(userId);
    await this.pullRecommendationCards(userId);
    await this.pullProfile(userId);
  }

  /** @deprecated use syncAll instead */
  async syncUserData(userId: string): Promise<number> {
    await this.syncAll(userId);
    return 0;
  }

  // ── Outbox ────────────────────────────────────────────────────────────────

  /** Drain the outbox — call on login and on foreground-resume */
  async flushOutbox(userId: string): Promise<void> {
    let rows: any[];
    try {
      rows = await DatabaseService.query<any>(
        'SELECT * FROM outbox WHERE user_id = ? AND attempts < 5 ORDER BY created_at ASC LIMIT 50',
        [userId],
      );
    } catch { return; }

    for (const row of rows) {
      try {
        const payload = JSON.parse(row.payload);
        const ref = doc(firestore, `users/${userId}/${row.entity}/${row.entity_id}`);
        if (row.operation === 'delete') {
          await setDoc(ref, { ...payload, deletedAt: Date.now(), updatedAt: Date.now() }, { merge: true });
        } else {
          await setDoc(ref, { ...payload, updatedAt: Date.now() }, { merge: true });
        }
        await DatabaseService.execute('DELETE FROM outbox WHERE id = ?', [row.id]);
      } catch (err: any) {
        logWarn('SyncService', 'flushOutbox item failed', { rowId: row.id, error: err });
        await DatabaseService.execute(
          'UPDATE outbox SET attempts = attempts + 1, last_error = ? WHERE id = ?',
          [err?.message || 'Unknown', row.id],
        );
      }
    }
    if (rows.length > 0) {
      console.log(`[SyncService] flushed ${rows.length} outbox items for ${userId}`);
    }
  }

  /** @deprecated renamed to flushOutbox */
  async pushMessages(userId: string): Promise<void> {
    return this.flushOutbox(userId);
  }

  // ── Push helpers ──────────────────────────────────────────────────────────

  /** Push a chat message to Firestore, fall back to outbox */
  async pushMessage(
    id: string,
    userId: string,
    data: { agentId: string; role: string; content: string; timestamp: number; conversationId?: string },
  ) {
    try {
      await setDoc(
        doc(firestore, `users/${userId}/messages/${id}`),
        { ...data, updatedAt: Date.now() },
        { merge: true },
      );
    } catch (e: any) {
      logWarn('SyncService', 'pushMessage failed, queueing', { id, error: e });
      await this.enqueueOutbox(userId, 'set', 'messages', id, data);
    }
  }

  /** Generic entity push to Firestore with outbox fallback */
  async pushEntity(
    userId: string,
    entity: string,
    entityId: string,
    data: Record<string, any>,
    operation: 'set' | 'delete' = 'set',
  ) {
    try {
      const ref = doc(firestore, `users/${userId}/${entity}/${entityId}`);
      const payload = operation === 'delete'
        ? { ...data, deletedAt: Date.now(), updatedAt: Date.now() }
        : { ...data, updatedAt: Date.now() };
      await setDoc(ref, payload, { merge: true });
    } catch (e: any) {
      logWarn('SyncService', `pushEntity(${entity}) failed, queueing`, { entityId, error: e });
      await this.enqueueOutbox(userId, operation, entity, entityId, data);
    }
  }

  private async enqueueOutbox(
    userId: string,
    operation: string,
    entity: string,
    entityId: string,
    data: Record<string, any>,
  ) {
    try {
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      await DatabaseService.execute(
        `INSERT INTO outbox (id, operation, entity, entity_id, payload, created_at, user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [`${Date.now()}-${randomSuffix}-${entityId}`, operation, entity, entityId, JSON.stringify(data), Date.now(), userId],
      );
    } catch (dbErr) {
      logError('SyncService.enqueueOutbox', dbErr, { entity });
    }
  }
}

export const SyncService = new SyncServiceClass();
