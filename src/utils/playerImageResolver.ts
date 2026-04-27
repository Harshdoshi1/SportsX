type CacheEntry = {
  imageUrl: string | null;
  expiresAt: number;
};

const memoryCache = new Map<string, CacheEntry>();

const normalizeNameKey = (v: string) =>
  String(v || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const STORAGE_KEY = "sportsx-player-image-cache-v1";
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

const readStorage = (): Record<string, CacheEntry> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const writeStorage = (next: Record<string, CacheEntry>) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
};

export async function resolvePlayerImageUrl(playerName: string, signal?: AbortSignal): Promise<string | null> {
  const key = normalizeNameKey(playerName);
  if (!key) return null;

  const now = Date.now();
  const mem = memoryCache.get(key);
  if (mem && mem.expiresAt > now) return mem.imageUrl;

  const stored = readStorage();
  const cached = stored[key];
  if (cached && cached.expiresAt > now) {
    memoryCache.set(key, cached);
    return cached.imageUrl;
  }

  try {
    const res = await fetch(`/api/players/image?name=${encodeURIComponent(playerName)}`, { signal });
    const json = (await res.json()) as { success?: boolean; imageUrl?: string | null };
    const imageUrl = json?.success ? (json.imageUrl ?? null) : null;
    const entry: CacheEntry = { imageUrl, expiresAt: now + TTL_MS };
    memoryCache.set(key, entry);
    stored[key] = entry;
    writeStorage(stored);
    return imageUrl;
  } catch {
    return null;
  }
}

