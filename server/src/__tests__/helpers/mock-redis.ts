/**
 * In-memory Redis mock for tests.
 *
 * Implements the subset of the ioredis API used by:
 *   - auth/store.ts  (get, set EX, del)
 *   - quests/generate.ts (incr, expire)
 *   - @fastify/rate-limit RedisStore (defineCommand + custom rateLimit command)
 */

interface Entry {
  value: string;
  expireAt?: number; // ms timestamp
}

export class MockRedis {
  private store = new Map<string, Entry>();
  private callCount = 0; // for rate-limit simulation

  private isExpired(entry: Entry): boolean {
    return entry.expireAt != null && Date.now() > entry.expireAt;
  }

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry || this.isExpired(entry)) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  // Supports `set(key, value)` and `set(key, value, 'EX', ttlSecs)`
  async set(key: string, value: string, mode?: string, ttl?: number): Promise<"OK"> {
    const expireAt =
      mode === "EX" && ttl != null ? Date.now() + ttl * 1000 : undefined;
    this.store.set(key, { value, expireAt });
    return "OK";
  }

  async incr(key: string): Promise<number> {
    const entry = this.store.get(key);
    const current =
      entry && !this.isExpired(entry) ? parseInt(entry.value, 10) : 0;
    const next = current + 1;
    this.store.set(key, { value: String(next), expireAt: entry?.expireAt });
    return next;
  }

  async expire(key: string, seconds: number): Promise<number> {
    const entry = this.store.get(key);
    if (!entry || this.isExpired(entry)) return 0;
    this.store.set(key, { ...entry, expireAt: Date.now() + seconds * 1000 });
    return 1;
  }

  async del(key: string): Promise<number> {
    return this.store.delete(key) ? 1 : 0;
  }

  async quit(): Promise<"OK"> {
    this.store.clear();
    return "OK";
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(_event: string, _handler: (...args: any[]) => void): this {
    return this;
  }

  // ioredis defineCommand — used by @fastify/rate-limit RedisStore to register the
  // Lua rate-limit script as a custom command.  We stub it as a no-op and provide
  // the actual `rateLimit` implementation below so the plugin can call it.
  defineCommand(name: string, _opts: unknown): void {
    // already defined inline — no-op
    void name;
  }

  // Custom command registered by @fastify/rate-limit.
  // Signature: rateLimit(key, timeWindow, max, ban, continueExceeding, cb)
  rateLimit(
    _key: string,
    timeWindow: number,
    _max: number,
    _ban: number,
    _continueExceeding: string,
    cb: (err: null, result: [number, number, number]) => void,
  ): void {
    this.callCount += 1;
    // Always allow — return current=1, ttl=timeWindow, ban=0
    cb(null, [1, timeWindow, 0]);
  }

  /** Expose call count for rate-limit behaviour assertions. */
  getCallCount(): number {
    return this.callCount;
  }

  /** Flush all keys (useful in beforeEach). */
  flush(): void {
    this.store.clear();
    this.callCount = 0;
  }
}
