// TTL cache for catalog JSON with an in-memory layer and optional best-effort disk layer.
// Disk I/O is automatically bypassed when running on serverless/edge runtimes (e.g. Cloudflare Workers).

import { createHash } from "node:crypto";

interface Entry {
  value: unknown;
  expires: number;
}

const store = new Map<string, Entry>();
const DEFAULT_TTL = 10 * 60 * 1000;

let fsModule: typeof import("node:fs") | null = null;
let pathModule: typeof import("node:path") | null = null;
let osModule: typeof import("node:os") | null = null;

// Dynamically load node modules only if filesystem is available
try {
  fsModule = require("node:fs");
  pathModule = require("node:path");
  osModule = require("node:os");
} catch {
  /* running on edge/workers without native fs */
}

let cacheDir: string | null = null;
let dirReady = false;

function getCacheDir(): string | null {
  if (cacheDir) return cacheDir;
  if (process.env.LUMEN_CACHE_DIR) {
    cacheDir = process.env.LUMEN_CACHE_DIR;
  } else if (osModule && pathModule) {
    try {
      cacheDir = pathModule.join(osModule.tmpdir(), "G-Player-cache");
    } catch {
      return null;
    }
  }
  return cacheDir;
}

function ensureDir() {
  if (dirReady || !fsModule) return;
  const dir = getCacheDir();
  if (!dir) return;
  try {
    fsModule.mkdirSync(dir, { recursive: true });
    dirReady = true;
  } catch {
    /* best-effort */
  }
}

function fileFor(key: string): string | null {
  const dir = getCacheDir();
  if (!dir || !pathModule) return null;
  const hash = createHash("sha1").update(key).digest("hex");
  return pathModule.join(dir, `${hash}.json`);
}

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

function diskGet<T>(key: string): T | undefined {
  if (!fsModule) return undefined;
  ensureDir();
  const filePath = fileFor(key);
  if (!filePath) return undefined;
  try {
    const raw = fsModule.readFileSync(filePath, "utf8");
    const entry = JSON.parse(raw) as Entry;
    if (Date.now() > entry.expires) return undefined;
    return entry.value as T;
  } catch {
    return undefined;
  }
}

function diskSet(key: string, value: unknown, ttl: number): void {
  if (!fsModule) return;
  ensureDir();
  const filePath = fileFor(key);
  if (!filePath) return;
  try {
    fsModule.writeFileSync(filePath, JSON.stringify({ value, expires: Date.now() + ttl }));
  } catch {
    /* best-effort */
  }
}

/** Wrap an async producer with memory + optional disk cache. */
export async function cached<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
  const mem = cacheGet<T>(key);
  if (mem !== undefined) return mem;

  const disk = diskGet<T>(key);
  if (disk !== undefined) {
    cacheSet(key, disk, ttl); // promote to memory
    return disk;
  }

  const value = await fn();
  cacheSet(key, value, ttl);
  diskSet(key, value, ttl);
  return value;
}
