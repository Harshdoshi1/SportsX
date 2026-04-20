import NodeCache from "node-cache";
import { env } from "../config/env.js";

export const apiCache = new NodeCache({
  stdTTL: env.cacheTtlSeconds,
  checkperiod: env.cacheCheckPeriodSeconds,
  useClones: false,
});

const backupCache = new Map();

export const getOrSetCache = async (key, fetcher, ttl = env.cacheTtlSeconds) => {
  const cached = apiCache.get(key);
  if (cached !== undefined) {
    return { data: cached, meta: { cacheHit: true } };
  }

  try {
    const data = await fetcher();
    apiCache.set(key, data, ttl);
    backupCache.set(key, data);
    return { data, meta: { cacheHit: false, fallback: false } };
  } catch (error) {
    if (backupCache.has(key)) {
      return { data: backupCache.get(key), meta: { cacheHit: false, fallback: true } };
    }
    throw error;
  }
};
