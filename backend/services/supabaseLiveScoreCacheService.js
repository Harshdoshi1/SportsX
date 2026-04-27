import { getSupabaseAdminClient, isSupabaseConfigured } from "../config/supabase.js";

const TABLE_NAME = "live_match_snapshots";
let tableAvailable = true;
let warnedMissingTable = false;

const isMissingTableError = (error) => {
  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes(`could not find the table 'public.${TABLE_NAME}'`) ||
    message.includes(`relation \"public.${TABLE_NAME}\" does not exist`) ||
    message.includes(`relation \"${TABLE_NAME}\" does not exist`)
  );
};

const getSupabase = () => {
  if (!isSupabaseConfigured()) {
    return null;
  }
  return getSupabaseAdminClient();
};

const toIso = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const parsed = new Date(raw);
  if (!Number.isFinite(parsed.getTime())) return null;
  return parsed.toISOString();
};

const isFresh = (fetchedAtIso, maxAgeMs) => {
  const fetched = new Date(String(fetchedAtIso || "")).getTime();
  if (!Number.isFinite(fetched)) return false;
  return Date.now() - fetched <= maxAgeMs;
};

const mapRowToSnapshot = (row) => ({
  matchId: String(row?.match_id || ""),
  sourceUrl: String(row?.source_url || ""),
  tournamentId: String(row?.tournament_id || "admin"),
  fetchedAt: row?.fetched_at || row?.updated_at || new Date().toISOString(),
  payload: row?.payload || null,
});

export const supabaseLiveScoreCacheService = {
  async upsertSnapshot(matchId, payload) {
    const supabase = getSupabase();
    if (!supabase || !tableAvailable) {
      return { written: false, reason: "supabase-not-ready" };
    }

    const id = String(matchId || "").trim();
    const body = payload || {};
    const match = body?.match || {};
    const score = body?.scoreboard || {};

    if (!id) {
      return { written: false, reason: "missing-match-id" };
    }

    const row = {
      match_id: id,
      source_url: String(match?.sourceUrl || ""),
      tournament_id: String(match?.tournamentId || "admin").toLowerCase(),
      series: String(match?.series || "Live Feed"),
      team1: String(match?.team1 || ""),
      team2: String(match?.team2 || ""),
      team1_score: match?.team1Score || null,
      team2_score: match?.team2Score || null,
      team1_overs: match?.team1Overs || null,
      team2_overs: match?.team2Overs || null,
      status: String(match?.status || "Live"),
      equation: score?.liveStats?.equation || null,
      fetched_at: toIso(match?.fetchedAt) || new Date().toISOString(),
      payload: body,
      updated_at: new Date().toISOString(),
    };

    const result = await supabase.from(TABLE_NAME).upsert([row], { onConflict: "match_id" });
    if (result?.error) {
      if (isMissingTableError(result.error)) {
        tableAvailable = false;
        if (!warnedMissingTable) {
          warnedMissingTable = true;
          // eslint-disable-next-line no-console
          console.warn(`[supabase-live-cache] table public.${TABLE_NAME} missing; cache writes disabled`);
        }
        return { written: false, reason: "missing-table" };
      }
      throw new Error(`[supabase-live-cache] upsert snapshot failed: ${result.error.message}`);
    }

    return { written: true };
  },

  async getSnapshotByMatchId(matchId, options = {}) {
    const supabase = getSupabase();
    if (!supabase || !tableAvailable) {
      return null;
    }

    const id = String(matchId || "").trim();
    if (!id) return null;

    const maxAgeMs = Number(options?.maxAgeMs ?? 20_000);

    const result = await supabase
      .from(TABLE_NAME)
      .select("*")
      .eq("match_id", id)
      .maybeSingle();

    if (result?.error) {
      if (isMissingTableError(result.error)) {
        tableAvailable = false;
        if (!warnedMissingTable) {
          warnedMissingTable = true;
          // eslint-disable-next-line no-console
          console.warn(`[supabase-live-cache] table public.${TABLE_NAME} missing; cache reads disabled`);
        }
        return null;
      }
      throw new Error(`[supabase-live-cache] read snapshot failed: ${result.error.message}`);
    }

    const row = result?.data;
    if (!row?.payload) return null;

    return {
      ...mapRowToSnapshot(row),
      stale: !isFresh(row?.fetched_at, maxAgeMs),
    };
  },

  async getSnapshotBySourceUrl(sourceUrl, options = {}) {
    const supabase = getSupabase();
    if (!supabase || !tableAvailable) {
      return null;
    }

    const url = String(sourceUrl || "").trim();
    if (!url) return null;

    const maxAgeMs = Number(options?.maxAgeMs ?? 20_000);

    const result = await supabase
      .from(TABLE_NAME)
      .select("*")
      .eq("source_url", url)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (result?.error) {
      if (isMissingTableError(result.error)) {
        tableAvailable = false;
        if (!warnedMissingTable) {
          warnedMissingTable = true;
          // eslint-disable-next-line no-console
          console.warn(`[supabase-live-cache] table public.${TABLE_NAME} missing; cache reads disabled`);
        }
        return null;
      }
      throw new Error(`[supabase-live-cache] read snapshot by url failed: ${result.error.message}`);
    }

    const row = result?.data;
    if (!row?.payload) return null;

    return {
      ...mapRowToSnapshot(row),
      stale: !isFresh(row?.fetched_at, maxAgeMs),
    };
  },

  async listFreshByTournament(tournamentId, options = {}) {
    const supabase = getSupabase();
    if (!supabase || !tableAvailable) {
      return [];
    }

    const tournament = String(tournamentId || "").toLowerCase();
    if (!tournament) return [];

    const maxAgeMs = Number(options?.maxAgeMs ?? 90_000);

    const result = await supabase
      .from(TABLE_NAME)
      .select("*")
      .eq("tournament_id", tournament)
      .order("updated_at", { ascending: false })
      .limit(20);

    if (result?.error) {
      if (isMissingTableError(result.error)) {
        tableAvailable = false;
        if (!warnedMissingTable) {
          warnedMissingTable = true;
          // eslint-disable-next-line no-console
          console.warn(`[supabase-live-cache] table public.${TABLE_NAME} missing; cache reads disabled`);
        }
        return [];
      }
      throw new Error(`[supabase-live-cache] list tournament snapshots failed: ${result.error.message}`);
    }

    return (result?.data || [])
      .map(mapRowToSnapshot)
      .filter((row) => row?.payload)
      .filter((row) => isFresh(row.fetchedAt, maxAgeMs));
  },
};
