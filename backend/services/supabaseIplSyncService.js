import crypto from "node:crypto";

import { iplScraperService } from "./iplScraperService.js";
import { iplTeamPlayersService } from "./iplTeamPlayersService.js";
import { env } from "../config/env.js";
import {
  getSupabaseAdminClient,
  isSupabaseConfigured,
  isSupabaseWriteConfigured,
  usesServiceRoleKey,
} from "../config/supabase.js";

const FEED_KEYS = {
  points: "ipl_points",
  matches: "ipl_matches",
  stats: "ipl_stats",
  squads: "ipl_squads",
  news: "ipl_news",
  teamPlayers: "ipl_team_players",
  heartbeat: "ipl_daily_heartbeat",
};

const inMemoryFeedCache = new Map();
let feedCacheTableAvailable = true;
let syncStateTableAvailable = true;
let warnedFeedCacheMissing = false;
let warnedSyncStateMissing = false;

const TEAM_FULL_NAME_BY_SHORT = {
  CSK: "Chennai Super Kings",
  DC: "Delhi Capitals",
  GT: "Gujarat Titans",
  KKR: "Kolkata Knight Riders",
  LSG: "Lucknow Super Giants",
  MI: "Mumbai Indians",
  PBKS: "Punjab Kings",
  RR: "Rajasthan Royals",
  RCB: "Royal Challengers Bengaluru",
  SRH: "Sunrisers Hyderabad",
};

const normalizeText = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const toSlug = (value) =>
  normalizeText(value)
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "");

const toHash = (payload) =>
  crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");

const isMissingTableError = (error, tableName) => {
  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes(`could not find the table 'public.${tableName}'`) ||
    message.includes(`relation \"public.${tableName}\" does not exist`) ||
    message.includes(`relation \"${tableName}\" does not exist`)
  );
};

const readFromMemoryFeedCache = (feedKey) => inMemoryFeedCache.get(feedKey)?.payload || null;

const writeToMemoryFeedCache = (feedKey, payload, payloadHash) => {
  inMemoryFeedCache.set(feedKey, {
    payload,
    payloadHash,
    updatedAt: Date.now(),
  });
};

const unwrap = (result, context) => {
  if (result?.error) {
    throw new Error(`[supabase-sync] ${context}: ${result.error.message}`);
  }
  return result?.data;
};

const assertWriteAccessConfigured = () => {
  if (isSupabaseWriteConfigured()) {
    return;
  }

  throw new Error(
    "[supabase-config] write access is not configured. Set SUPABASE_SERVICE_ROLE_KEY or set SUPABASE_ALLOW_PUBLISHABLE_WRITES=true for temporary dev-only mode.",
  );
};

const toIsoDateTime = (dateText, timeText) => {
  const candidate = String(`${dateText || ""} ${timeText || ""}`.trim());
  const parsed = new Date(candidate);
  if (Number.isFinite(parsed.getTime())) {
    return parsed.toISOString();
  }
  return new Date().toISOString();
};

const parseScore = (value) => {
  const raw = String(value || "").trim();
  if (!raw) {
    return { runs: null, wickets: null, overs: null };
  }

  const runsMatch = raw.match(/^(\d{1,3})/);
  const wicketsMatch = raw.match(/^\d{1,3}[/-](\d{1,2})/);
  const oversMatch = raw.match(/\((\d+(?:\.\d+)?)\s*OV\)/i);

  return {
    runs: runsMatch ? Number(runsMatch[1]) : null,
    wickets: wicketsMatch ? Number(wicketsMatch[1]) : null,
    overs: oversMatch ? Number(oversMatch[1]) : null,
  };
};

const mapStatus = (value) => {
  const normalized = normalizeText(value);
  if (!normalized) return "scheduled";
  if (normalized.includes("live")) return "live";
  if (normalized.includes("completed") || normalized.includes("won") || normalized.includes("result")) {
    return "completed";
  }
  if (normalized.includes("abandoned")) return "abandoned";
  if (normalized.includes("no result")) return "no_result";
  return "scheduled";
};

const toUiStatus = (value) => {
  const normalized = mapStatus(value);
  if (normalized === "completed") return "Completed";
  if (normalized === "live") return "Live";
  if (normalized === "abandoned") return "Abandoned";
  if (normalized === "no_result") return "No Result";
  return "Upcoming";
};

const formatScore = ({ runs, wickets, overs }) => {
  if (runs === null || runs === undefined) {
    return null;
  }

  const wicketsPart = Number.isFinite(Number(wickets)) ? `/${Number(wickets)}` : "";
  const oversPart = Number.isFinite(Number(overs)) ? ` (${Number(overs).toFixed(1)} OV)` : "";
  return `${Number(runs)}${wicketsPart}${oversPart}`;
};

const formatDateAndTime = (isoValue) => {
  const parsed = new Date(isoValue);
  if (!Number.isFinite(parsed.getTime())) {
    return { date: "TBA", startTime: "" };
  }

  const date = parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const startTime = `${parsed.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })} IST`;

  return { date, startTime };
};

const getTeamLookup = () => {
  const catalog = iplTeamPlayersService.getTeamCatalog();
  const byShort = new Map();
  const byName = new Map();

  for (const team of catalog) {
    byShort.set(team.short, team);
    byName.set(normalizeText(team.name), team);
  }

  return { byShort, byName };
};

const resolveTeamMeta = (input, lookup) => {
  const raw = String(input || "").trim();
  if (!raw) return null;

  const byShort = lookup.byShort.get(raw.toUpperCase());
  if (byShort) {
    return { short: byShort.short, name: byShort.name };
  }

  const byName = lookup.byName.get(normalizeText(raw));
  if (byName) {
    return { short: byName.short, name: byName.name };
  }

  const short = raw.toUpperCase();
  if (TEAM_FULL_NAME_BY_SHORT[short]) {
    return { short, name: TEAM_FULL_NAME_BY_SHORT[short] };
  }

  return {
    short: short.length <= 6 ? short : short.slice(0, 6),
    name: raw,
  };
};

let seasonCache = { id: null, at: 0 };

const getSupabase = () => {
  if (!isSupabaseConfigured()) {
    return null;
  }
  return getSupabaseAdminClient();
};

const ensureLeagueAndSeason = async () => {
  const supabase = getSupabase();
  if (!supabase) return null;

  if (seasonCache.id && Date.now() - seasonCache.at < 60_000) {
    return seasonCache.id;
  }

  const seasonYear = Number(env.iplSeasonYear || new Date().getFullYear());
  const leagueTitle = `IPL ${seasonYear}`;

  await unwrap(
    await supabase
    .from("leagues")
    .upsert(
      [{ code: "ipl", name: "Indian Premier League", country: "India", sport: "cricket" }],
      { onConflict: "code" },
    ),
    "upsert leagues",
  );

  const leagueRow = unwrap(
    await supabase.from("leagues").select("id").eq("code", "ipl").single(),
    "read leagues",
  );

  if (!leagueRow?.id) {
    return null;
  }

  await unwrap(
    await supabase
    .from("seasons")
    .upsert(
      [{ league_id: leagueRow.id, season_year: seasonYear, title: leagueTitle, is_current: true }],
      { onConflict: "league_id,season_year" },
    ),
    "upsert seasons",
  );

  const seasonRow = unwrap(
    await supabase
      .from("seasons")
      .select("id")
      .eq("league_id", leagueRow.id)
      .eq("season_year", seasonYear)
      .single(),
    "read seasons",
  );

  seasonCache = { id: seasonRow?.id || null, at: Date.now() };
  return seasonCache.id;
};

const readFeed = async (feedKey) => {
  const supabase = getSupabase();
  if (!supabase) return readFromMemoryFeedCache(feedKey);

  if (!feedCacheTableAvailable) {
    return readFromMemoryFeedCache(feedKey);
  }

  const result = await supabase
    .from("ipl_feed_cache")
    .select("payload")
    .eq("feed_key", feedKey)
    .maybeSingle();

  if (result?.error) {
    if (isMissingTableError(result.error, "ipl_feed_cache")) {
      feedCacheTableAvailable = false;
      if (!warnedFeedCacheMissing) {
        warnedFeedCacheMissing = true;
        // eslint-disable-next-line no-console
        console.warn("[supabase-sync] table public.ipl_feed_cache not available, using in-memory fallback cache");
      }
      return readFromMemoryFeedCache(feedKey);
    }

    throw new Error(`[supabase-sync] read feed ${feedKey}: ${result.error.message}`);
  }

  const data = result?.data;

  return data?.payload || null;
};

const upsertFeed = async (feedKey, payload) => {
  const supabase = getSupabase();
  const payloadHash = toHash(payload);

  const persistInMemory = () => {
    const existingMemory = inMemoryFeedCache.get(feedKey);
    const changed = existingMemory?.payloadHash !== payloadHash;
    writeToMemoryFeedCache(feedKey, payload, payloadHash);
    return { changed, hash: payloadHash };
  };

  if (!supabase || !feedCacheTableAvailable) {
    return persistInMemory();
  }

  const existingResult = await supabase
    .from("ipl_feed_cache")
    .select("payload_hash")
    .eq("feed_key", feedKey)
    .maybeSingle();

  if (existingResult?.error) {
    if (isMissingTableError(existingResult.error, "ipl_feed_cache")) {
      feedCacheTableAvailable = false;
      if (!warnedFeedCacheMissing) {
        warnedFeedCacheMissing = true;
        // eslint-disable-next-line no-console
        console.warn("[supabase-sync] table public.ipl_feed_cache not available, using in-memory fallback cache");
      }
      return persistInMemory();
    }

    throw new Error(`[supabase-sync] read feed hash ${feedKey}: ${existingResult.error.message}`);
  }

  const existing = existingResult?.data;

  if (existing?.payload_hash === payloadHash) {
    if (syncStateTableAvailable) {
      const syncResult = await supabase
        .from("sync_job_state")
        .upsert(
          [{ job_key: feedKey, payload_hash: payloadHash, last_run_at: new Date().toISOString() }],
          { onConflict: "job_key" },
        );

      if (syncResult?.error && isMissingTableError(syncResult.error, "sync_job_state")) {
        syncStateTableAvailable = false;
        if (!warnedSyncStateMissing) {
          warnedSyncStateMissing = true;
          // eslint-disable-next-line no-console
          console.warn("[supabase-sync] table public.sync_job_state not available, sync metadata persistence disabled");
        }
      } else if (syncResult?.error) {
        throw new Error(`[supabase-sync] upsert sync state ${feedKey}: ${syncResult.error.message}`);
      }
    }

    writeToMemoryFeedCache(feedKey, payload, payloadHash);

    return { changed: false, hash: payloadHash };
  }

  await unwrap(
    await supabase
    .from("ipl_feed_cache")
    .upsert(
      [
        {
          feed_key: feedKey,
          payload,
          payload_hash: payloadHash,
          updated_at: new Date().toISOString(),
        },
      ],
      { onConflict: "feed_key" },
    ),
    `upsert feed ${feedKey}`,
  );

  if (syncStateTableAvailable) {
    const syncResult = await supabase
      .from("sync_job_state")
      .upsert(
        [
          {
            job_key: feedKey,
            payload_hash: payloadHash,
            last_run_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
        { onConflict: "job_key" },
      );

    if (syncResult?.error && isMissingTableError(syncResult.error, "sync_job_state")) {
      syncStateTableAvailable = false;
      if (!warnedSyncStateMissing) {
        warnedSyncStateMissing = true;
        // eslint-disable-next-line no-console
        console.warn("[supabase-sync] table public.sync_job_state not available, sync metadata persistence disabled");
      }
    } else if (syncResult?.error) {
      throw new Error(`[supabase-sync] upsert sync state ${feedKey}: ${syncResult.error.message}`);
    }
  }

  writeToMemoryFeedCache(feedKey, payload, payloadHash);

  return { changed: true, hash: payloadHash };
};

const ensureTeams = async (teamsInput) => {
  const supabase = getSupabase();
  if (!supabase) return new Map();

  const lookup = getTeamLookup();
  const normalized = [];

  for (const item of teamsInput) {
    const resolved = resolveTeamMeta(item, lookup);
    if (!resolved) continue;
    normalized.push(resolved);
  }

  const uniqueByShort = new Map(normalized.map((team) => [team.short, team]));
  const rows = Array.from(uniqueByShort.values()).map((team) => ({
    short_code: team.short,
    name: team.name,
    active: true,
  }));

  if (rows.length > 0) {
    await unwrap(
      await supabase.from("teams").upsert(rows, { onConflict: "short_code" }),
      "upsert teams",
    );
  }

  const teamRows = unwrap(
    await supabase
      .from("teams")
      .select("id, short_code, name")
      .in("short_code", rows.map((row) => row.short_code)),
    "read teams",
  );

  return new Map((teamRows || []).map((team) => [team.short_code, team]));
};

const persistPointsTable = async (points) => {
  const supabase = getSupabase();
  if (!supabase) return;

  const seasonId = await ensureLeagueAndSeason();
  if (!seasonId) return;

  const lookup = getTeamLookup();
  const teamsForUpsert = points
    .map((row) => resolveTeamMeta(row.team, lookup))
    .filter(Boolean);

  const teamByShort = await ensureTeams(teamsForUpsert.map((team) => team.short));

  const ordered = points
    .map((row) => {
      const resolved = resolveTeamMeta(row.team, lookup);
      if (!resolved) return null;
      const team = teamByShort.get(resolved.short);
      if (!team?.id) return null;
      return {
        teamId: team.id,
        played: Number(row.played || 0),
        won: Number(row.win || 0),
        lost: Number(row.loss || 0),
        tied: Number(row.nr || 0),
        points: Number(row.points || 0),
        netRunRate: Number(row.nrr || 0),
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.points - a.points || b.netRunRate - a.netRunRate);

  const snapshotAt = new Date().toISOString();
  const rows = ordered.map((entry, index) => ({
    season_id: seasonId,
    snapshot_at: snapshotAt,
    team_id: entry.teamId,
    position: index + 1,
    played: entry.played,
    won: entry.won,
    lost: entry.lost,
    tied: entry.tied,
    no_result: 0,
    points: entry.points,
    net_run_rate: Number.isFinite(entry.netRunRate) ? entry.netRunRate : 0,
  }));

  if (rows.length > 0) {
    await unwrap(
      await supabase.from("points_table_snapshots").insert(rows),
      "insert points snapshots",
    );
  }
};

const persistMatches = async (matches) => {
  const supabase = getSupabase();
  if (!supabase) return;

  const seasonId = await ensureLeagueAndSeason();
  if (!seasonId) return;

  const teams = await ensureTeams(
    matches.flatMap((match) => [match.team1, match.team2, match.team1Name, match.team2Name]).filter(Boolean),
  );

  const matchRows = matches
    .map((match) => {
      const homeMeta = resolveTeamMeta(match.team1 || match.team1Name, getTeamLookup());
      const awayMeta = resolveTeamMeta(match.team2 || match.team2Name, getTeamLookup());
      if (!homeMeta || !awayMeta) return null;

      return {
        season_id: seasonId,
        match_no: match.matchNo || null,
        stage: null,
        status: mapStatus(match.status),
        result_text: match.result || null,
        starts_at: toIsoDateTime(match.date, match.startTime),
        source_provider: "iplt20-scraper",
        source_match_id: String(match.id),
      };
    })
    .filter(Boolean);

  if (matchRows.length > 0) {
    await unwrap(
      await supabase.from("matches").upsert(matchRows, { onConflict: "season_id,source_provider,source_match_id" }),
      "upsert matches",
    );
  }

  const storedMatches = unwrap(
    await supabase
      .from("matches")
      .select("id, source_match_id")
      .eq("season_id", seasonId)
      .eq("source_provider", "iplt20-scraper")
      .in("source_match_id", matches.map((match) => String(match.id))),
    "read stored matches",
  );

  const matchIdBySource = new Map((storedMatches || []).map((row) => [String(row.source_match_id), row.id]));

  const matchTeamRows = [];
  for (const match of matches) {
    const matchId = matchIdBySource.get(String(match.id));
    if (!matchId) continue;

    const homeMeta = resolveTeamMeta(match.team1 || match.team1Name, getTeamLookup());
    const awayMeta = resolveTeamMeta(match.team2 || match.team2Name, getTeamLookup());
    const home = homeMeta ? teams.get(homeMeta.short) : null;
    const away = awayMeta ? teams.get(awayMeta.short) : null;
    if (!home?.id || !away?.id) continue;

    const homeScore = parseScore(match.team1Score);
    const awayScore = parseScore(match.team2Score);

    matchTeamRows.push({
      match_id: matchId,
      team_id: home.id,
      is_home: true,
      innings_no: 1,
      score_runs: homeScore.runs,
      score_wickets: homeScore.wickets,
      score_overs: homeScore.overs,
    });

    matchTeamRows.push({
      match_id: matchId,
      team_id: away.id,
      is_home: false,
      innings_no: 2,
      score_runs: awayScore.runs,
      score_wickets: awayScore.wickets,
      score_overs: awayScore.overs,
    });
  }

  if (matchTeamRows.length > 0) {
    await unwrap(
      await supabase.from("match_teams").upsert(matchTeamRows, { onConflict: "match_id,team_id" }),
      "upsert match teams",
    );
  }

  await unwrap(
    await supabase.rpc("refresh_home_upcoming_games", { p_season_id: seasonId, p_limit: 50 }),
    "refresh home upcoming games",
  );
};

const persistTeamPlayers = async (teamPlayersPayload) => {
  const supabase = getSupabase();
  if (!supabase) return;

  const seasonId = await ensureLeagueAndSeason();
  if (!seasonId) return;

  const teamCodes = Object.keys(teamPlayersPayload || {});
  const teams = await ensureTeams(teamCodes);

  for (const teamCode of teamCodes) {
    const team = teams.get(teamCode);
    if (!team?.id) continue;

    const players = Array.isArray(teamPlayersPayload[teamCode]) ? teamPlayersPayload[teamCode] : [];
    const playerRows = players.map((player) => ({
      full_name: player.name,
      display_name: player.name,
      slug: toSlug(`${player.name}-${teamCode}-${player.id || ""}`),
      primary_role: player.role || null,
      image_url: player.image || null,
      profile_url: player.profileUrl || null,
      active: true,
    }));

    if (playerRows.length === 0) continue;

    await unwrap(
      await supabase.from("players").upsert(playerRows, { onConflict: "slug" }),
      "upsert players",
    );

    const storedPlayers = unwrap(
      await supabase
        .from("players")
        .select("id, slug")
        .in("slug", playerRows.map((row) => row.slug)),
      "read players",
    );

    const playerIdBySlug = new Map((storedPlayers || []).map((row) => [row.slug, row.id]));

    const rosterRows = [];
    const seasonStatRows = [];

    for (const player of players) {
      const slug = toSlug(`${player.name}-${teamCode}-${player.id || ""}`);
      const playerId = playerIdBySlug.get(slug);
      if (!playerId) continue;

      rosterRows.push({
        season_id: seasonId,
        team_id: team.id,
        player_id: playerId,
        squad_role: player.role || null,
      });

      seasonStatRows.push({
        season_id: seasonId,
        team_id: team.id,
        player_id: playerId,
        matches: Number(player.matches || 0),
        innings: Number(player.matches || 0),
        runs: Number(player.runs || 0),
        wickets: Number(player.wickets || 0),
        batting_average: player.average ?? null,
        batting_strike_rate: player.strikeRate ?? null,
        bowling_economy: player.economy ?? null,
      });
    }

    if (rosterRows.length > 0) {
      await unwrap(
        await supabase.from("team_rosters").upsert(rosterRows, { onConflict: "season_id,team_id,player_id" }),
        "upsert team rosters",
      );
    }

    if (seasonStatRows.length > 0) {
      await unwrap(
        await supabase.from("player_season_stats").upsert(seasonStatRows, { onConflict: "season_id,player_id" }),
        "upsert player season stats",
      );
    }
  }
};

const readPointsFromSupabase = async () => {
  const supabase = getSupabase();
  if (!supabase) return null;

  const seasonId = await ensureLeagueAndSeason();
  if (!seasonId) return null;

  const latestSnapshotResult = await supabase
    .from("points_table_snapshots")
    .select("snapshot_at")
    .eq("season_id", seasonId)
    .order("snapshot_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestSnapshotResult?.error) {
    throw new Error(`[supabase-sync] read latest points snapshot: ${latestSnapshotResult.error.message}`);
  }

  const latestSnapshot = latestSnapshotResult?.data?.snapshot_at;
  if (!latestSnapshot) return [];

  const rowsResult = await supabase
    .from("points_table_snapshots")
    .select("team_id, position, played, won, lost, tied, points, net_run_rate")
    .eq("season_id", seasonId)
    .eq("snapshot_at", latestSnapshot)
    .order("position", { ascending: true });

  if (rowsResult?.error) {
    throw new Error(`[supabase-sync] read points snapshot rows: ${rowsResult.error.message}`);
  }

  const rows = rowsResult?.data || [];
  if (rows.length === 0) return [];

  const teamIds = Array.from(new Set(rows.map((row) => row.team_id).filter(Boolean)));
  const teamsResult = await supabase
    .from("teams")
    .select("id, short_code, name")
    .in("id", teamIds);

  if (teamsResult?.error) {
    throw new Error(`[supabase-sync] read teams for points: ${teamsResult.error.message}`);
  }

  const teamById = new Map((teamsResult?.data || []).map((team) => [team.id, team]));

  return rows.map((row) => {
    const team = teamById.get(row.team_id);
    return {
      team: team?.short_code || team?.name || "TBD",
      teamName: team?.name || null,
      played: Number(row.played || 0),
      win: Number(row.won || 0),
      loss: Number(row.lost || 0),
      nr: Number(row.tied || 0),
      points: Number(row.points || 0),
      nrr: String(row.net_run_rate ?? "0"),
    };
  });
};

const readMatchesFromSupabase = async () => {
  const supabase = getSupabase();
  if (!supabase) return null;

  const seasonId = await ensureLeagueAndSeason();
  if (!seasonId) return null;

  const matchesResult = await supabase
    .from("matches")
    .select("id, source_match_id, match_no, status, result_text, starts_at")
    .eq("season_id", seasonId)
    .order("starts_at", { ascending: true });

  if (matchesResult?.error) {
    throw new Error(`[supabase-sync] read matches: ${matchesResult.error.message}`);
  }

  const matches = matchesResult?.data || [];
  if (matches.length === 0) return [];

  const matchIds = matches.map((match) => match.id);
  const matchTeamsResult = await supabase
    .from("match_teams")
    .select("match_id, team_id, innings_no, is_home, score_runs, score_wickets, score_overs")
    .in("match_id", matchIds);

  if (matchTeamsResult?.error) {
    throw new Error(`[supabase-sync] read match teams: ${matchTeamsResult.error.message}`);
  }

  const matchTeams = matchTeamsResult?.data || [];
  const teamIds = Array.from(new Set(matchTeams.map((row) => row.team_id).filter(Boolean)));
  const teamsResult = teamIds.length
    ? await supabase.from("teams").select("id, short_code, name").in("id", teamIds)
    : { data: [], error: null };

  if (teamsResult?.error) {
    throw new Error(`[supabase-sync] read teams for matches: ${teamsResult.error.message}`);
  }

  const teamsById = new Map((teamsResult?.data || []).map((team) => [team.id, team]));
  const matchTeamsByMatchId = new Map();

  for (const row of matchTeams) {
    const existing = matchTeamsByMatchId.get(row.match_id) || [];
    existing.push(row);
    matchTeamsByMatchId.set(row.match_id, existing);
  }

  return matches.map((match) => {
    const entries = (matchTeamsByMatchId.get(match.id) || []).slice().sort((a, b) => {
      const inningsA = Number.isFinite(Number(a.innings_no)) ? Number(a.innings_no) : a.is_home ? 1 : 2;
      const inningsB = Number.isFinite(Number(b.innings_no)) ? Number(b.innings_no) : b.is_home ? 1 : 2;
      return inningsA - inningsB;
    });

    const home = entries[0] || null;
    const away = entries[1] || null;
    const homeTeam = home ? teamsById.get(home.team_id) : null;
    const awayTeam = away ? teamsById.get(away.team_id) : null;
    const dateTime = formatDateAndTime(match.starts_at);

    return {
      id: String(match.source_match_id || match.id),
      matchNo: match.match_no || null,
      team1: homeTeam?.short_code || "TBD",
      team2: awayTeam?.short_code || "TBD",
      team1Name: homeTeam?.name || homeTeam?.short_code || "TBD",
      team2Name: awayTeam?.name || awayTeam?.short_code || "TBD",
      team1Score: home
        ? formatScore({ runs: home.score_runs, wickets: home.score_wickets, overs: home.score_overs })
        : null,
      team2Score: away
        ? formatScore({ runs: away.score_runs, wickets: away.score_wickets, overs: away.score_overs })
        : null,
      date: dateTime.date,
      startTime: dateTime.startTime,
      venue: null,
      status: toUiStatus(match.status),
      result: match.result_text || null,
    };
  });
};

const readTeamPlayersFromSupabase = async (teamCode) => {
  const supabase = getSupabase();
  if (!supabase) return null;

  const code = String(teamCode || "").toUpperCase();
  if (!code) return [];

  const seasonId = await ensureLeagueAndSeason();
  if (!seasonId) return null;

  const teamResult = await supabase
    .from("teams")
    .select("id, short_code, name")
    .eq("short_code", code)
    .maybeSingle();

  if (teamResult?.error) {
    throw new Error(`[supabase-sync] read team by code ${code}: ${teamResult.error.message}`);
  }

  const team = teamResult?.data;
  if (!team?.id) return [];

  const rosterResult = await supabase
    .from("team_rosters")
    .select("player_id, squad_role")
    .eq("season_id", seasonId)
    .eq("team_id", team.id);

  if (rosterResult?.error) {
    throw new Error(`[supabase-sync] read team rosters ${code}: ${rosterResult.error.message}`);
  }

  const rosters = rosterResult?.data || [];
  const playerIds = rosters.map((row) => row.player_id).filter(Boolean);
  if (playerIds.length === 0) return [];

  const playersResult = await supabase
    .from("players")
    .select("id, full_name, display_name, primary_role, image_url, profile_url")
    .in("id", playerIds);

  if (playersResult?.error) {
    throw new Error(`[supabase-sync] read players for team ${code}: ${playersResult.error.message}`);
  }

  const statsResult = await supabase
    .from("player_season_stats")
    .select("player_id, matches, runs, wickets, batting_average, batting_strike_rate, bowling_economy")
    .eq("season_id", seasonId)
    .in("player_id", playerIds);

  if (statsResult?.error) {
    throw new Error(`[supabase-sync] read season stats for team ${code}: ${statsResult.error.message}`);
  }

  const playerById = new Map((playersResult?.data || []).map((row) => [row.id, row]));
  const roleByPlayerId = new Map(rosters.map((row) => [row.player_id, row.squad_role || null]));
  const statsByPlayerId = new Map((statsResult?.data || []).map((row) => [row.player_id, row]));

  return playerIds
    .map((playerId) => {
      const player = playerById.get(playerId);
      if (!player) return null;

      const stat = statsByPlayerId.get(playerId);
      return {
        id: playerId,
        name: player.display_name || player.full_name,
        role: roleByPlayerId.get(playerId) || player.primary_role || null,
        image: player.image_url || null,
        season: String(env.iplSeasonYear || new Date().getFullYear()),
        matches: Number(stat?.matches || 0),
        runs: Number(stat?.runs || 0),
        wickets: Number(stat?.wickets || 0),
        average: stat?.batting_average ?? null,
        strikeRate: stat?.batting_strike_rate ?? null,
        economy: stat?.bowling_economy ?? null,
        profileUrl: player.profile_url || null,
        team: team.name,
      };
    })
    .filter(Boolean);
};

const scrapeTeamPlayersPayload = async (forceRefresh = false) => {
  const catalog = iplTeamPlayersService.getTeamCatalog();
  const payload = {};

  for (const team of catalog) {
    payload[team.short] = await iplTeamPlayersService.scrapeTeamPlayersWithStats(team.name, { forceRefresh });
  }

  return payload;
};

const syncFeed = async (feedKey, fetcher, persister = null, forcePersist = false) => {
  const payload = await fetcher();
  const write = await upsertFeed(feedKey, payload);

  if (persister && (write.changed || forcePersist)) {
    await persister(payload);
  }

  return {
    feedKey,
    changed: write.changed,
    count: Array.isArray(payload) ? payload.length : Object.keys(payload || {}).length,
  };
};

const getFeedOrSync = async (feedKey, fetcher, persister = null, forceFresh = false) => {
  if (!forceFresh) {
    const cached = await readFeed(feedKey);
    if (cached !== null) {
      return cached;
    }
  }

  const payload = await fetcher();
  const write = await upsertFeed(feedKey, payload);
  if (persister && (write.changed || forceFresh)) {
    await persister(payload);
  }

  return payload;
};

const performDailyHeartbeat = async () => {
  const supabase = getSupabase();
  if (!supabase) {
    return { skipped: true, reason: "supabase-not-configured" };
  }

  const dateKey = new Date().toISOString().slice(0, 10);
  const markerPayload = { date: dateKey };

  const markerWrite = await upsertFeed(FEED_KEYS.heartbeat, markerPayload);
  if (!markerWrite.changed) {
    return { skipped: true, reason: "already-ran-today" };
  }

  const slug = `dummy-heartbeat-${dateKey}`;

  await unwrap(
    await supabase.from("players").upsert(
      [
        {
          full_name: `Heartbeat Dummy ${dateKey}`,
          display_name: "Heartbeat Dummy",
          slug,
          primary_role: "Utility",
          active: false,
        },
      ],
      { onConflict: "slug" },
    ),
    "insert daily heartbeat player",
  );

  await unwrap(
    await supabase.from("players").delete().eq("slug", slug),
    "delete daily heartbeat player",
  );

  return { skipped: false, dateKey };
};

const getSyncStatusInternal = async () => {
  const status = {
    enabled: isSupabaseConfigured(),
    writesConfigured: isSupabaseWriteConfigured(),
    usesServiceRoleKey: usesServiceRoleKey(),
    allowsPublishableWrites: Boolean(env.supabaseAllowPublishableWrites),
    feedCacheTableAvailable,
    syncStateTableAvailable,
    inMemoryFeedCount: inMemoryFeedCache.size,
    supabase: {
      feedCacheRows: null,
      syncStateRows: null,
      pointsSnapshots: null,
      playerSeasonStats: null,
      errors: [],
    },
  };

  const supabase = getSupabase();
  if (!supabase) {
    return status;
  }

  const countQuery = async (table, assignKey) => {
    const result = await supabase.from(table).select("*", { count: "exact", head: true });
    if (result?.error) {
      status.supabase.errors.push(`${table}: ${result.error.message}`);
      return;
    }
    status.supabase[assignKey] = result?.count ?? 0;
  };

  await countQuery("ipl_feed_cache", "feedCacheRows");
  await countQuery("sync_job_state", "syncStateRows");
  await countQuery("points_table_snapshots", "pointsSnapshots");
  await countQuery("player_season_stats", "playerSeasonStats");

  return status;
};

export const supabaseIplSyncService = {
  isEnabled() {
    return isSupabaseConfigured();
  },

  async syncAllFeeds(forceFresh = false) {
    if (!this.isEnabled()) {
      return { enabled: false, results: [] };
    }

    assertWriteAccessConfigured();

    const results = [];
    results.push(await syncFeed(FEED_KEYS.points, () => iplScraperService.scrapePointsTable(), persistPointsTable, forceFresh));
    results.push(await syncFeed(FEED_KEYS.matches, () => iplScraperService.scrapeMatches(), persistMatches, forceFresh));
    results.push(await syncFeed(FEED_KEYS.stats, () => iplScraperService.scrapeStats(), null, forceFresh));
    results.push(await syncFeed(FEED_KEYS.squads, () => iplScraperService.scrapeSquads(), null, forceFresh));
    results.push(await syncFeed(FEED_KEYS.news, () => iplScraperService.scrapeNews(), null, forceFresh));

    if (forceFresh) {
      const teamPlayersPayload = await scrapeTeamPlayersPayload(true);
      const feedResult = await syncFeed(FEED_KEYS.teamPlayers, async () => teamPlayersPayload, persistTeamPlayers, true);
      results.push(feedResult);
    }

    return { enabled: true, results };
  },

  async getPoints(forceFresh = false) {
    const fromSupabase = await readPointsFromSupabase();
    if (!forceFresh && Array.isArray(fromSupabase) && fromSupabase.length > 0) {
      return fromSupabase;
    }

    const payload = await getFeedOrSync(
      FEED_KEYS.points,
      () => iplScraperService.scrapePointsTable(),
      persistPointsTable,
      forceFresh,
    );

    const refreshedFromSupabase = await readPointsFromSupabase();
    if (Array.isArray(refreshedFromSupabase) && refreshedFromSupabase.length > 0) {
      return refreshedFromSupabase;
    }

    return payload;
  },

  async getMatches(forceFresh = false) {
    const fromSupabase = await readMatchesFromSupabase();
    if (!forceFresh && Array.isArray(fromSupabase) && fromSupabase.length > 0) {
      return fromSupabase;
    }

    const payload = await getFeedOrSync(
      FEED_KEYS.matches,
      () => iplScraperService.scrapeMatches(),
      persistMatches,
      forceFresh,
    );

    const refreshedFromSupabase = await readMatchesFromSupabase();
    if (Array.isArray(refreshedFromSupabase) && refreshedFromSupabase.length > 0) {
      return refreshedFromSupabase;
    }

    return payload;
  },

  async getStats(forceFresh = false) {
    return getFeedOrSync(FEED_KEYS.stats, () => iplScraperService.scrapeStats(), null, forceFresh);
  },

  async getSquads(forceFresh = false) {
    return getFeedOrSync(FEED_KEYS.squads, () => iplScraperService.scrapeSquads(), null, forceFresh);
  },

  async getNews(forceFresh = false) {
    return getFeedOrSync(FEED_KEYS.news, () => iplScraperService.scrapeNews(), null, forceFresh);
  },

  async getTeamPlayersByTeamCode(teamCode, forceFresh = false) {
    const fromSupabase = await readTeamPlayersFromSupabase(teamCode);
    if (!forceFresh && Array.isArray(fromSupabase) && fromSupabase.length > 0) {
      return fromSupabase;
    }

    const payload = await getFeedOrSync(
      FEED_KEYS.teamPlayers,
      () => scrapeTeamPlayersPayload(forceFresh),
      persistTeamPlayers,
      forceFresh,
    );

    const code = String(teamCode || "").toUpperCase();
    const fromFeed = Array.isArray(payload?.[code]) ? payload[code] : [];

    const refreshedFromSupabase = await readTeamPlayersFromSupabase(teamCode);
    if (Array.isArray(refreshedFromSupabase) && refreshedFromSupabase.length > 0) {
      return refreshedFromSupabase;
    }

    return fromFeed;
  },

  async syncTeamPlayers(forceFresh = false) {
    if (!this.isEnabled()) {
      return { enabled: false, changed: false };
    }

    assertWriteAccessConfigured();

    const payload = await scrapeTeamPlayersPayload(forceFresh);
    const result = await syncFeed(FEED_KEYS.teamPlayers, async () => payload, persistTeamPlayers, forceFresh);
    return { enabled: true, ...result };
  },

  async performDailyHeartbeat() {
    assertWriteAccessConfigured();
    return performDailyHeartbeat();
  },

  async forceBackfillNow() {
    return this.syncAllFeeds(true);
  },

  async getSyncStatus() {
    return getSyncStatusInternal();
  },
};
