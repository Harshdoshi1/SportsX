import axios from "axios";
import { env } from "../config/env.js";
import { getOrSetCache } from "../utils/cache.js";
import { retry } from "../utils/retry.js";

const cricApiClient = axios.create({
  baseURL: env.cricApiBaseUrl,
  timeout: env.cricApiTimeoutMs,
  headers: {
    "Content-Type": "application/json",
  },
});

const buildCacheKey = (path, params) => {
  const sortedParams = Object.entries(params || {})
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .map(([key, value]) => `${key}:${value}`)
    .join("|");

  return `cricapi:${path}?${sortedParams}`;
};

const mapUpstreamError = (error) => {
  const upstreamStatus = error?.response?.status;

  if (upstreamStatus === 401 || upstreamStatus === 403) {
    const authError = new Error(
      "CricAPI authentication failed. Verify CRIC_API_KEY and subscription plan.",
    );
    authError.statusCode = upstreamStatus;
    return authError;
  }

  if (upstreamStatus === 429) {
    const rateLimitError = new Error("CricAPI rate limit reached. Please retry shortly.");
    rateLimitError.statusCode = 429;
    return rateLimitError;
  }

  const genericError = new Error(error?.message || "Failed to fetch CricAPI data.");
  genericError.statusCode = upstreamStatus || 502;
  return genericError;
};

const request = async (path, params = {}) => {
  if (!env.cricApiKey) {
    const configError = new Error("CRIC_API_KEY is not configured.");
    configError.statusCode = 503;
    throw configError;
  }

  const requestParams = { ...params, apikey: env.cricApiKey };
  const cacheKey = buildCacheKey(path, requestParams);

  try {
    return await getOrSetCache(
      cacheKey,
      async () => {
        const response = await retry(
          () => cricApiClient.get(path, { params: requestParams }),
          {
            retries: env.retryCount,
            baseDelayMs: env.retryDelayMs,
          },
        );

        return response.data;
      },
      env.cacheTtlSeconds,
    );
  } catch (error) {
    throw mapUpstreamError(error);
  }
};

export const cricApiService = {
  getCurrentMatches: () => request("/currentMatches", { offset: 0 }),
  getAllMatches: () => request("/matches", { offset: 0 }),
};
