/**
 * TelemetryClient — lightweight client-side analytics and error reporting.
 *
 * Integrates with the server-side analytics endpoints added in PIX-254:
 *   POST /api/analytics/session/start
 *   POST /api/analytics/session/end
 *   POST /api/analytics/zone/enter
 *   POST /api/analytics/zone/exit
 *
 * Privacy controls:
 *   - Telemetry is opt-out.  Set localStorage key 'pr_telemetry_disabled' to '1' to disable.
 *   - Player IDs are anonymous UUIDs stored in localStorage ('pr_anon_id'), never tied
 *     to account data unless the caller explicitly passes a username/userId.
 *   - No PII is transmitted; only game-play signals (zone, level, combat counts, errors).
 *
 * Usage:
 *   TelemetryClient.init();              // once at app startup
 *   TelemetryClient.startSession();      // on scene create / game start
 *   TelemetryClient.enterZone('zone2');  // on zone load
 *   TelemetryClient.exitZone();          // on zone exit / scene shutdown
 *   TelemetryClient.endSession();        // on page unload or return to menu
 *   TelemetryClient.recordError(err);    // on caught error
 */

const SERVER_HTTP: string = (() => {
  const wsUrl: string =
    ((import.meta as Record<string, any>).env?.VITE_COLYSEUS_URL as string | undefined)
    ?? 'ws://localhost:2567';
  return wsUrl.replace('ws://', 'http://').replace('wss://', 'https://');
})();

const OPT_OUT_KEY = 'pr_telemetry_disabled';
const ANON_ID_KEY = 'pr_anon_id';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  // Fallback for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function getOrCreateAnonId(): string {
  try {
    let id = localStorage.getItem(ANON_ID_KEY);
    if (!id) {
      id = generateUUID();
      localStorage.setItem(ANON_ID_KEY, id);
    }
    return id;
  } catch {
    return generateUUID();
  }
}

function post(path: string, body: Record<string, unknown>): void {
  try {
    fetch(`${SERVER_HTTP}${path}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
      keepalive: true,
    }).catch(() => { /* fire-and-forget; ignore network errors */ });
  } catch {
    // fetch unavailable (e.g. SSR / test env) — silently ignore
  }
}

export class TelemetryClient {
  private static _playerId: string  = '';
  private static _sessionId: string = '';
  private static _visitId: string   = '';
  private static _initialized       = false;

  /** Initialise the singleton — sets up global error handlers.  Call once at startup. */
  static init(): void {
    if (this._initialized) return;
    this._initialized = true;

    if (this.isDisabled()) return;

    this._playerId = getOrCreateAnonId();

    // Capture unhandled JS errors
    window.addEventListener('error', (event: ErrorEvent) => {
      this.recordError({
        message: event.message,
        source:  event.filename ?? '',
        line:    event.lineno ?? 0,
        col:     event.colno  ?? 0,
      });
    });

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message = reason instanceof Error ? reason.message : String(reason);
      this.recordError({ message, source: 'unhandledrejection' });
    });

    // End session gracefully when the tab is hidden or closed
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.endSession();
    });
    window.addEventListener('pagehide', () => this.endSession(), { once: true });
  }

  /** Start an analytics session.  Safe to call multiple times — only the first call per session takes effect. */
  static startSession(): void {
    if (this.isDisabled() || this._sessionId) return;

    try {
      fetch(`${SERVER_HTTP}/api/analytics/session/start`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ playerId: this._playerId }),
      })
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (data?.sessionId) this._sessionId = data.sessionId;
        })
        .catch(() => { /* ignore */ });
    } catch { /* ignore */ }
  }

  /** Record entry into a zone.  Must be called after startSession(). */
  static enterZone(zoneId: string): void {
    if (this.isDisabled() || !this._sessionId) return;

    try {
      fetch(`${SERVER_HTTP}/api/analytics/zone/enter`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ playerId: this._playerId, sessionId: this._sessionId, zoneId }),
      })
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (data?.visitId) this._visitId = data.visitId;
        })
        .catch(() => { /* ignore */ });
    } catch { /* ignore */ }
  }

  /** Record exit from the current zone. */
  static exitZone(): void {
    if (this.isDisabled() || !this._visitId) return;

    post('/api/analytics/zone/exit', { visitId: this._visitId });
    this._visitId = '';
  }

  /** End the current session.  Idempotent — subsequent calls are no-ops. */
  static endSession(): void {
    if (this.isDisabled() || !this._sessionId) return;

    this.exitZone();
    post('/api/analytics/session/end', { sessionId: this._sessionId, playerId: this._playerId });
    this._sessionId = '';
  }

  /**
   * Record a client-side error for observability.
   * Errors are logged to console; future iterations may POST to a dedicated endpoint.
   */
  static recordError(info: { message: string; source?: string; line?: number; col?: number }): void {
    // Always log to console regardless of opt-out, so devs see errors in browser devtools.
    console.error('[TelemetryClient] Unhandled error:', info);

    // POST to the server if a session is active so the team can see client errors.
    if (this.isDisabled() || !this._sessionId) return;
    post('/api/analytics/client-error', {
      sessionId: this._sessionId,
      playerId:  this._playerId,
      ...info,
    });
  }

  /** Return whether the player has opted out of telemetry. */
  static isDisabled(): boolean {
    try {
      return localStorage.getItem(OPT_OUT_KEY) === '1';
    } catch {
      return false;
    }
  }

  /** Opt the player out of telemetry collection. */
  static disable(): void {
    try { localStorage.setItem(OPT_OUT_KEY, '1'); } catch { /* ignore */ }
    this.endSession();
  }

  /** Opt the player back in to telemetry collection. */
  static enable(): void {
    try { localStorage.removeItem(OPT_OUT_KEY); } catch { /* ignore */ }
  }
}
