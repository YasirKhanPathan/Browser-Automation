import crypto from "crypto";

interface CacheEntry {
  value: string;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 hour

// Periodic cleanup every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (entry.expiresAt < now) {
      cache.delete(key);
    }
  }
}, 10 * 60 * 1000);

export function getCachedLLMResponse(prompt: string): string | null {
  const key = crypto.createHash("sha256").update(prompt).digest("hex");
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }
  console.log(`[LLM Cache] Hit for prompt hash ${key.slice(0, 8)}...`);
  return entry.value;
}

export function setCachedLLMResponse(prompt: string, response: string, ttlMs: number = DEFAULT_TTL_MS): void {
  const key = crypto.createHash("sha256").update(prompt).digest("hex");
  cache.set(key, { value: response, expiresAt: Date.now() + ttlMs });
}

export function clearLLMCache(): void {
  cache.clear();
}
