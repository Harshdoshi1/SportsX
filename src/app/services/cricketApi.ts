const API_BASE_URL = import.meta.env.VITE_BACKEND_API_URL || "/api";

const REQUEST_CACHE_TTL_MS = 60_000;

type CachedEntry = {
  data: unknown;
  expiresAt: number;
};

const responseCache = new Map<string, CachedEntry>();
const inFlightRequests = new Map<string, Promise<unknown>>();
let globalRateLimitUntil = 0;

const getCachedResponse = <T>(path: string): T | null => {
  const cached = responseCache.get(path);
  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= Date.now()) {
    responseCache.delete(path);
    return null;
  }

  return cached.data as T;
};

const setCachedResponse = (path: string, data: unknown) => {
  responseCache.set(path, {
    data,
    expiresAt: Date.now() + REQUEST_CACHE_TTL_MS,
  });
};

const parseRetryAfterMs = (retryAfterHeader: string | null): number | null => {
  if (!retryAfterHeader) {
    return null;
  }

  const asNumber = Number(retryAfterHeader);
  if (Number.isFinite(asNumber) && asNumber >= 0) {
    return asNumber * 1000;
  }

  const asDate = Date.parse(retryAfterHeader);
  if (Number.isFinite(asDate)) {
    return Math.max(0, asDate - Date.now());
  }

  return null;
};

type ApiError = Error & {
  statusCode?: number;
  rawMessage?: string;
};

const friendlyMessageForStatus = (statusCode: number, backendMessage?: string) => {
  if (statusCode === 429) {
    return "Too many requests right now. Please retry in a minute.";
  }

  if (statusCode === 401 || statusCode === 403) {
    return "Authentication failed for upstream provider.";
  }

  if (statusCode >= 500) {
    return backendMessage || "Cricket data provider is temporarily unavailable.";
  }

  return backendMessage || `Request failed (${statusCode})`;
};

export interface ApiResponse<T> {
  success: boolean;
  meta?: Record<string, unknown>;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  message?: string;
  details?: string;
  [key: string]: unknown;
  data?: T;
}

async function request<T>(path: string): Promise<T> {
  const cached = getCachedResponse<T>(path);
  if (cached) {
    return cached;
  }

  if (Date.now() < globalRateLimitUntil) {
    const rateLimitedError: ApiError = new Error(
      "Rate limit cooldown active. Please retry shortly.",
    );
    rateLimitedError.statusCode = 429;
    throw rateLimitedError;
  }

  const existingRequest = inFlightRequests.get(path);
  if (existingRequest) {
    return existingRequest as Promise<T>;
  }

  const requestPromise = (async () => {
  let res: Response;

  try {
    res = await fetch(`${API_BASE_URL}${path}`);
  } catch {
    const networkError: ApiError = new Error(
      "Cannot reach backend API. Make sure the server is running on port 4000.",
    );
    networkError.statusCode = 0;
    throw networkError;
  }

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (res.status === 429) {
    const retryAfterMs = parseRetryAfterMs(res.headers.get("retry-after"));
    const cooldownMs = retryAfterMs ?? 30_000;
    globalRateLimitUntil = Date.now() + cooldownMs;

    const stale = getCachedResponse<T>(path);
    if (stale) {
      return stale;
    }
  }

  if (!res.ok || !data?.success) {
    const err: ApiError = new Error(
      friendlyMessageForStatus(res.status, data?.message),
    );
    err.statusCode = res.status;
    err.rawMessage = data?.message;
    throw err;
  }

  setCachedResponse(path, data);
  return data as T;
  })();

  inFlightRequests.set(path, requestPromise);

  try {
    return await requestPromise;
  } finally {
    inFlightRequests.delete(path);
  }
}

export const cricketApi = {
  getIplPoints: () => request(`/ipl/points`),

  getIplScrapedMatches: () => request(`/ipl/matches`),

  getIplStats: () => request(`/ipl/stats`),

  getIplSquads: () => request(`/ipl/squads`),

  getIplNews: () => request(`/ipl/news`),

  getLiveMatches: (page = 1, limit = 20) =>
    request(`/matches/live?page=${page}&limit=${limit}`),

  getUpcomingMatches: (page = 1, limit = 20) =>
    request(`/matches/upcoming?page=${page}&limit=${limit}`),

  getIplMatches: (page = 1, limit = 20) =>
    request(`/matches/ipl?page=${page}&limit=${limit}`),

  getMatchDetails: (id: string | number) => request(`/match/${id}`),

  getTeams: (params?: { page?: number; limit?: number; q?: string }) => {
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 20;
    const q = params?.q ? `&q=${encodeURIComponent(params.q)}` : "";
    return request(`/teams?page=${page}&limit=${limit}${q}`);
  },

  getPlayersByTeam: (
    teamId: string | number,
    params?: { page?: number; limit?: number; q?: string; teamName?: string }
  ) => {
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 20;
    const q = params?.q ? `&q=${encodeURIComponent(params.q)}` : "";
    const teamName = params?.teamName ? `&teamName=${encodeURIComponent(params.teamName)}` : "";
    return request(`/team/${teamId}/players?page=${page}&limit=${limit}${q}${teamName}`);
  },

  getTeamPlayers: (teamId: string | number, params?: { page?: number; limit?: number; q?: string; teamName?: string }) =>
    cricketApi.getPlayersByTeam(teamId, params),

  search: (q: string, type: "all" | "team" | "player" = "all", page = 1, limit = 20) =>
    request(`/search?q=${encodeURIComponent(q)}&type=${type}&page=${page}&limit=${limit}`),
};
