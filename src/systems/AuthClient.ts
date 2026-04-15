/**
 * AuthClient — thin wrapper around the PixelRealm auth server.
 *
 * Manages login / register / logout for the auth server (default :3001).
 * On successful login or register, stores credentials in localStorage so
 * all in-game systems (including WalletPanel) can access the JWT.
 *
 * localStorage keys written:
 *   pr_accessToken  — JWT access token (15 min)
 *   pr_refreshToken — JWT refresh token (7 days)
 *   pr_userId       — UUID of the authenticated player
 *   pr_username     — display name of the authenticated player
 *
 * Usage:
 *   const result = await AuthClient.login('hero', 'hunter2!');
 *   if (result.ok) { // proceed to game }
 *   else            { // show result.error }
 */

const AUTH_HTTP: string =
  ((import.meta as Record<string, unknown>).env?.['VITE_AUTH_URL'] as string | undefined)
  ?? 'http://localhost:3001';

export interface AuthResult {
  ok: boolean;
  error?: string;
  userId?: string;
  username?: string;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function storeCredentials(accessToken: string, refreshToken: string, userId: string, username: string): void {
  try {
    localStorage.setItem('pr_accessToken',  accessToken);
    localStorage.setItem('pr_refreshToken', refreshToken);
    localStorage.setItem('pr_userId',       userId);
    localStorage.setItem('pr_username',     username);
  } catch {
    console.warn('[AuthClient] localStorage unavailable — credentials not persisted');
  }
}

function clearCredentials(): void {
  try {
    localStorage.removeItem('pr_accessToken');
    localStorage.removeItem('pr_refreshToken');
    localStorage.removeItem('pr_userId');
    localStorage.removeItem('pr_username');
  } catch { /* ignore */ }
}

// ── Public API ────────────────────────────────────────────────────────────────

export class AuthClient {
  /** Returns the currently stored access token, or null if not logged in. */
  static getAccessToken(): string | null {
    try { return localStorage.getItem('pr_accessToken'); } catch { return null; }
  }

  /** Returns whether there is a stored access token. */
  static isLoggedIn(): boolean {
    return !!AuthClient.getAccessToken();
  }

  /** Log in with username + password. Stores JWT on success. */
  static async login(username: string, password: string): Promise<AuthResult> {
    try {
      const res = await fetch(`${AUTH_HTTP}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const body = await res.json() as {
        accessToken?: string;
        refreshToken?: string;
        user?: { id: string; username: string };
        error?: string;
      };

      if (!res.ok) {
        return { ok: false, error: body.error ?? `Login failed (${res.status})` };
      }

      storeCredentials(
        body.accessToken!,
        body.refreshToken!,
        body.user!.id,
        body.user!.username,
      );
      return { ok: true, userId: body.user!.id, username: body.user!.username };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Network error' };
    }
  }

  /** Register a new account. Stores JWT on success. */
  static async register(username: string, password: string, email?: string): Promise<AuthResult> {
    try {
      const res = await fetch(`${AUTH_HTTP}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, ...(email ? { email } : {}) }),
      });
      const body = await res.json() as {
        accessToken?: string;
        refreshToken?: string;
        user?: { id: string; username: string };
        error?: string;
      };

      if (!res.ok) {
        return { ok: false, error: body.error ?? `Registration failed (${res.status})` };
      }

      storeCredentials(
        body.accessToken!,
        body.refreshToken!,
        body.user!.id,
        body.user!.username,
      );
      return { ok: true, userId: body.user!.id, username: body.user!.username };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Network error' };
    }
  }

  /** Use the stored refresh token to issue a new access token. */
  static async refreshToken(): Promise<boolean> {
    try {
      const refreshToken = localStorage.getItem('pr_refreshToken');
      if (!refreshToken) return false;

      const res = await fetch(`${AUTH_HTTP}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      const body = await res.json() as {
        accessToken?: string;
        refreshToken?: string;
        user?: { id: string; username: string };
      };

      if (!res.ok || !body.accessToken) return false;

      storeCredentials(
        body.accessToken,
        body.refreshToken!,
        body.user!.id,
        body.user!.username,
      );
      return true;
    } catch {
      return false;
    }
  }

  /** Log out — invalidates server session and clears local storage. */
  static async logout(): Promise<void> {
    const token = AuthClient.getAccessToken();
    if (token) {
      try {
        await fetch(`${AUTH_HTTP}/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch { /* ignore network error on logout */ }
    }
    clearCredentials();
  }
}
