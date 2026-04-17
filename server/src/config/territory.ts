/**
 * Server-side territory wars configuration — war window scheduling.
 *
 * nextWarWindow is a pure function (no DB, no side-effects) shared by both
 * the client and the server. It is kept here instead of importing from the
 * client src/ tree so the server tsconfig rootDir constraint is satisfied.
 */

/** War windows open at these UTC hours. Each window lasts 2 hours. */
const WAR_WINDOW_HOURS_UTC = [8, 16, 22] as const;
const WAR_WINDOW_DURATION_MS = 2 * 60 * 60 * 1000;

/**
 * Returns the start and end of the next upcoming war window from `now`.
 * If `now` falls inside a window, returns the *next* window (not the current).
 * Pure function — safe to use in both client and server contexts.
 */
export function nextWarWindow(now: Date = new Date()): { start: Date; end: Date } {
  const ms = now.getTime();
  const todayMidnight = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );

  const candidates: Date[] = [];
  for (let day = 0; day <= 1; day++) {
    for (const hour of WAR_WINDOW_HOURS_UTC) {
      const start = new Date(todayMidnight + day * 86_400_000 + hour * 3_600_000);
      // Only include windows that haven't started yet (skip the currently open window)
      if (start.getTime() > ms) {
        candidates.push(start);
      }
    }
  }

  candidates.sort((a, b) => a.getTime() - b.getTime());
  const start = candidates[0];
  const end   = new Date(start.getTime() + WAR_WINDOW_DURATION_MS);
  return { start, end };
}
