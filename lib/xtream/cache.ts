// TTL cache for catalog JSON.
// Pure memory store to ensure 100% compatibility with Cloudflare Workers / Edge runtime.

interface Entry {
  value: unknown;
  expires: number;
}

const store = new Map<string, Entry>();
const DEFAULT_TTL = 10 * 60 * 1000;

export function cacheGet<T>(key: string): T | undefined {
  const hit = store.get(key);
  if (!hit) return undefined;
  if (Date.now() > hit.expires) {
    store.delete(key);
    return undefined;
  }
  return hit.value as T;
}

export function cacheSet(key: string, value: unknown, ttl = DEFAULT_TTL): void {
  store.set(key, { value, expires: Date.now() + ttl });
}

/** Wrap an async producer with memory cache. */
export async function cached<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
  const mem = cacheGet<T>(key);
  if (mem !== undefined) return mem;

  const value = await fn();
  cacheSet(key, value, ttl);
  return value;
}
