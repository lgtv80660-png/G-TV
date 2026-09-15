// TTL cache for catalog JSON.
// Pure memory store to ensure 100% compatibility with Cloudflare Workers / Edge runtime.

interface Entry {
  value: unknown;
  expires: number;
}

const store = new Map<string, Entry>();
const DEFAULT_TTL = 10 * 60 * 1000; // 10 minutes

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

/** Supprime une clé spécifique du cache (Invalidation ciblée) */
export function cacheDelete(key: string): void {
  store.delete(key);
}

/** Vide l'intégralité du cache RAM (Réinitialisation totale) */
export function cacheClear(): void {
  store.clear();
}

/** Wrap an async producer with memory cache. */
export async function cached<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
  const mem = cacheGet<T>(key);
  if (mem !== undefined) return mem;

  const value = await fn();
  cacheSet(key, value, ttl);
  return value;
}

/** 
 * Version intelligente : Vérifie si le serveur Xtream a changé avant de renvoyer le cache.
 * Si le serverHash a changé depuis le dernier appel, le cache mémoire est vidé immédiatement.
 */
export async function cachedWithValidation<T>(
  key: string,
  serverHash: string,
  ttl: number,
  fn: () => Promise<T>
): Promise<T> {
  const hashKey = `${key}_hash`;
  const cachedHash = cacheGet<string>(hashKey);

  // Si le hash a changé côté admin, on invalide la clé enregistrée en mémoire
  if (cachedHash && cachedHash !== serverHash) {
    cacheDelete(key);
  }

  const mem = cacheGet<T>(key);
  if (mem !== undefined) return mem;

  const value = await fn();
  cacheSet(key, value, ttl);
  cacheSet(hashKey, serverHash, ttl);
  return value;
}
