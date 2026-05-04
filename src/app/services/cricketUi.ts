import { getIplTeamByShort } from "../data/iplTeams";
import { IPL_PLAYER_IMAGES } from "../data/ipl2026";

export const IPL_NAME_TO_SHORT: Record<string, string> = {
  mi: "MI",
  csk: "CSK",
  rcb: "RCB",
  kkr: "KKR",
  dc: "DC",
  srh: "SRH",
  pbks: "PBKS",
  rr: "RR",
  gt: "GT",
  lsg: "LSG",
  "mumbai indians": "MI",
  "chennai super kings": "CSK",
  "royal challengers bengaluru": "RCB",
  "kolkata knight riders": "KKR",
  "delhi capitals": "DC",
  "sunrisers hyderabad": "SRH",
  "punjab kings": "PBKS",
  "rajasthan royals": "RR",
  "gujarat titans": "GT",
  "lucknow super giants": "LSG",
  "mumbai": "MI",
  "chennai": "CSK",
  "bangalore": "RCB",
  "kolkata": "KKR",
  "delhi": "DC",
  "hyderabad": "SRH",
  "punjab": "PBKS",
  "rajasthan": "RR",
  "gujarat": "GT",
  "lucknow": "LSG",
};

export const SHORT_TO_TEAM_ID: Record<string, string> = {
  RCB: "rcb",
  MI: "mi",
  CSK: "csk",
  KKR: "kkr",
  DC: "dc",
  SRH: "srh",
  PBKS: "pbks",
  RR: "rr",
  GT: "gt",
  LSG: "lsg",
};

export const normalizeText = (value?: string | null) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export const safeArray = <T>(value: unknown): T[] => {
  if (Array.isArray(value)) {
    return value as T[];
  }
  return [];
};

export const DASH = "—";

export type ScoreDisplay = {
  runsText: string;
  oversText: string;
};

export type CommentaryEntry = {
  over: string;
  text: string;
  commentary?: string;
};

export type LiveBatter = {
  name: string;
  dismissal: string;
  runs: string;
  balls: string;
  fours: string;
  sixes: string;
  strikeRate: string;
  isOnStrike: boolean;
  imageUrl: string | null;
};

export type LiveBowler = {
  name: string;
  overs: string;
  maidens: string;
  runs: string;
  wickets: string;
  economy: string;
  imageUrl: string | null;
};

export type ScorecardInnings = {
  key: string;
  title: string;
  team: string;
  score: string;
  overs: string;
  extras: string;
  total: string;
  batting: LiveBatter[];
  bowling: LiveBowler[];
};

const toDisplayText = (value: unknown, fallback = DASH) => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

const normalizeWicketCount = (value: unknown) => {
  const text = String(value ?? "").trim();
  if (!text) {
    return "0";
  }

  const parsed = Number(text);
  if (Number.isFinite(parsed)) {
    return String(parsed);
  }

  return text.replace(/^0+/, "") || "0";
};

const splitCompactScore = (tail: string) => {
  const compact = String(tail || "").trim();
  const hit = compact.match(/^(\d+)\.(\d+)$/);
  if (!hit) {
    return null;
  }

  const whole = hit[1];
  const decimal = hit[2];

  const decimalNum = Number(decimal);
  if (!Number.isFinite(decimalNum) || decimalNum < 0 || decimalNum > 9) {
    return null;
  }

  // Crex sometimes glues wickets and overs into the score tail.
  // Requirement: after '-', only 1 digit is wicket and remaining digits are overs,
  // except the valid all-out case of 10 wickets.
  const isAllOutPrefix = whole.startsWith("10") && whole.length > 2;
  const wickets = isAllOutPrefix ? "10" : whole.slice(0, 1);
  const oversWhole = isAllOutPrefix ? whole.slice(2) : whole.slice(1);
  const wicketsNum = Number(wickets);
  if (!Number.isFinite(wicketsNum) || wicketsNum < 0 || wicketsNum > 10) {
    return null;
  }
  if (!oversWhole) {
    return null;
  }
  return {
    wickets,
    overs: `${Number(oversWhole)}.${decimal}`,
  };
};

export const parseRunsAndOvers = (value: unknown): ScoreDisplay => {
  const raw = String(value || "").trim();
  if (!raw) {
    return { runsText: DASH, oversText: "" };
  }

  const normalizeSplitWickets = (wicketsRaw: string, oversRaw: string) => {
    const wicketsText = String(wicketsRaw || "").trim();
    const oversText = String(oversRaw || "").trim();

    // If wickets and overs digits are glued (e.g. `32` with overs `.1` coming separately),
    // treat the first digit as wicket and carry remaining digits into overs.
    // Keep `10` wickets as-is.
    if (wicketsText.length > 1 && wicketsText !== "10" && oversText) {
      return {
        wickets: wicketsText[0],
        overs: `${wicketsText.slice(1)}${oversText}`,
      };
    }

    return { wickets: wicketsText, overs: oversText };
  };

  // Handle format: "19-4 (4.2)" or "19-4 4.2"
  const withOvers = raw.match(/^\s*(\d{1,3})\s*[-/]\s*(\d{1,2})\s*\(?(\d+\.\d+|\d+)\)?\s*$/);
  if (withOvers) {
    const normalized = normalizeSplitWickets(withOvers[2], withOvers[3]);
    return {
      runsText: `${withOvers[1]}-${normalizeWicketCount(normalized.wickets)}`,
      oversText: normalized.overs,
    };
  }

  // Handle format: "19-4.2" (where 4.2 is wickets and overs)
  const compact = raw.match(/^\s*(\d{1,3})\s*[-/]\s*(\d+\.\d+)\s*$/);
  if (compact) {
    const runs = compact[1];
    const tail = compact[2];
    const split = splitCompactScore(tail);
    if (split) {
      return {
        runsText: `${runs}-${normalizeWicketCount(split.wickets)}`,
        oversText: split.overs,
      };
    }
  }

  // Fallback to standard "19-4"
  const standard = raw.match(/^\s*(\d{1,3})\s*[-/]\s*(\d{1,2})\s*$/);
  if (standard) {
    const wicketsRaw = String(standard[2] || "").trim();
    const wicketsNum = Number(wicketsRaw);
    const hasMergedOvers = wicketsRaw.length > 1 && wicketsRaw !== "10" && Number.isFinite(wicketsNum) && wicketsNum >= 0;
    const wicketsText = hasMergedOvers ? wicketsRaw[0] : wicketsRaw;
    const oversCarry = hasMergedOvers ? wicketsRaw.slice(1) : "";
    return {
      runsText: `${standard[1]}-${normalizeWicketCount(wicketsText)}`,
      oversText: oversCarry,
    };
  }

  return { runsText: raw, oversText: "" };
};

const readLiveStat = (liveStats: any, keys: string[]) => {
  for (const key of keys) {
    const value = liveStats?.[key];
    const text = String(value ?? "").trim();
    if (text) {
      return text;
    }
  }
  return "";
};

const toTokenArray = (value: unknown) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }
  return String(value || "")
    .trim()
    .split(/[\s,|]+/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const uniqueRowsByName = <T extends { name?: string }>(rows: T[]) => {
  const seen = new Set<string>();
  const unique: T[] = [];

  for (let index = rows.length - 1; index >= 0; index -= 1) {
    const row = rows[index];
    const name = normalizeText(String(row?.name || ""));
    if (!name || seen.has(name)) {
      continue;
    }
    seen.add(name);
    unique.push(row);
  }

  return unique.reverse();
};

const readBattingValue = (row: any, keys: string[], fallback = DASH) => {
  for (const key of keys) {
    const value = row?.[key];
    const text = String(value ?? "").trim();
    if (text) {
      return text;
    }
  }
  return fallback;
};

const slugifyPlayerName = (value: unknown) =>
  normalizeText(String(value || ""))
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "");

const PLAYER_IMAGE_ALIASES: Record<string, string> = {
  "philip-salt": "phil-salt",
  "b-sai-sudharsan": "sai-sudharsan",
  "sai-sudharshan": "sai-sudharsan",
  "varun-chakravarthy": "varun-chakaravarthy",
  "varun-chakravarti": "varun-chakaravarthy",
  "mohammad-siraj": "mohammed-siraj",
  "mohd-izhar": "mohd-izhar",
  "allah-mohammad-ghazanfar": "allah-ghazanfar",
  "auqib-nabi-dar": "auqib-nabi",
  "mitchell-owen": "mitch-owen",
  "harnoor-singh": "harnoor-pannu",
};

export const getPlayerImageUrl = (playerName: unknown) => {
  const primary = slugifyPlayerName(playerName);
  if (!primary) {
    return null;
  }

  const candidateKeys = [primary];
  const alias = PLAYER_IMAGE_ALIASES[primary];
  if (alias) {
    candidateKeys.push(alias);
  }

  for (const key of candidateKeys) {
    if (IPL_PLAYER_IMAGES[key]) {
      return IPL_PLAYER_IMAGES[key];
    }
  }

  return null;
};

const normalizeBatter = (row: any, index: number): LiveBatter => ({
  name: toDisplayText(row?.name || row?.player || row?.batter || row?.batsman),
  dismissal: toDisplayText(row?.dismissal || row?.howOut || row?.status || row?.out, DASH),
  runs: readBattingValue(row, ["runs", "r"], DASH),
  balls: readBattingValue(row, ["balls", "b"], DASH),
  fours: readBattingValue(row, ["fours", "4s", "four", "foursHit"], DASH),
  sixes: readBattingValue(row, ["sixes", "6s", "six", "sixesHit"], DASH),
  strikeRate: readBattingValue(row, ["strikeRate", "sr", "strike_rate"], DASH),
  isOnStrike: Boolean(row?.isOnStrike || row?.strike || (index === 0 && row?.name)),
  imageUrl: getPlayerImageUrl(row?.name || row?.player || row?.batter || row?.batsman),
});

const normalizeBowler = (row: any): LiveBowler => {
  const figures = String(row?.figures || "").trim();
  const wicketPart = figures.split("-")[0] || "";
  const runPart = figures.split("-")[1] || "";

  return {
    name: toDisplayText(row?.name || row?.player || row?.bowler),
    overs: readBattingValue(row, ["overs", "o"], DASH),
    maidens: readBattingValue(row, ["maidens", "m"], "0"),
    runs: readBattingValue(row, ["runs", "r"], runPart || DASH),
    wickets: readBattingValue(row, ["wickets", "w"], wicketPart || DASH),
    economy: readBattingValue(row, ["economy", "econ", "er"], DASH),
    imageUrl: getPlayerImageUrl(row?.name || row?.player || row?.bowler),
  };
};

const makeInningsKey = (title: string, index: number) =>
  `${normalizeText(title).replace(/\s+/g, "-") || "innings"}-${index}`;

const buildFallbackInnings = (payload: any): ScorecardInnings[] => {
  const scoreboard = payload?.scoreboard || payload || {};
  const rootBatters = safeArray<any>(scoreboard?.batters).map(normalizeBatter);
  const rootBowlers = safeArray<any>(scoreboard?.bowlers).map(normalizeBowler);
  const scoreboardInnings = safeArray<any>(scoreboard?.innings);

  if (scoreboardInnings.length === 0 && rootBatters.length === 0 && rootBowlers.length === 0) {
    return [];
  }

  if (scoreboardInnings.length === 0) {
    return [
      {
        key: "innings-0",
        title: "Current Innings",
        team: DASH,
        score: DASH,
        overs: DASH,
        extras: DASH,
        total: DASH,
        batting: rootBatters.slice(0, 22),
        bowling: rootBowlers.slice(0, 22),
      },
    ];
  }

  return scoreboardInnings.map((inning, index) => {
    const parsed = parseRunsAndOvers(inning?.score || `${inning?.runs ?? ""}-${inning?.wickets ?? ""}`);
    const title = toDisplayText(inning?.title || inning?.team || `Innings ${index + 1}`);
    return {
      key: makeInningsKey(title, index),
      title,
      team: toDisplayText(inning?.team || inning?.title || `Innings ${index + 1}`),
      score: parsed.runsText,
      overs: toDisplayText(parsed.oversText || inning?.overs),
      extras: toDisplayText(inning?.extras),
      total: toDisplayText(inning?.total || parsed.runsText),
      batting: index === 0 ? rootBatters.slice(0, 22) : [],
      bowling: index === 0 ? rootBowlers.slice(0, 22) : [],
    };
  });
};

export const getScorecardInnings = (payload: any): ScorecardInnings[] => {
  const scoreboard = payload?.scoreboard || payload || {};
  const directInnings = safeArray<any>(scoreboard?.scorecard?.innings || scoreboard?.innings || payload?.scorecard?.innings);
  
  if (directInnings.length === 0) {
    return buildFallbackInnings(payload);
  }

  return directInnings.map((inning, index) => {
    const scoreVal = inning?.score || `${inning?.runs ?? ""}-${inning?.wickets ?? ""}`;
    const parsed = parseRunsAndOvers(scoreVal);
    const title = toDisplayText(inning?.title || inning?.team || `Innings ${index + 1}`);
    const batting = safeArray<any>(inning?.batting || inning?.batters).map(normalizeBatter).slice(0, 22);
    const bowling = safeArray<any>(inning?.bowling || inning?.bowlers).map(normalizeBowler).slice(0, 22);

    return {
      key: makeInningsKey(title, index),
      title,
      team: toDisplayText(inning?.team || inning?.title || `Innings ${index + 1}`),
      score: parsed.runsText,
      overs: toDisplayText(parsed.oversText || inning?.overs),
      extras: toDisplayText(inning?.extras),
      total: toDisplayText(inning?.total || parsed.runsText),
      batting,
      bowling,
    };
  });
};

export const getCommentaryEntries = (payload: any): CommentaryEntry[] => {
  const direct = safeArray<any>(
    payload?.scoreboard?.commentary ||
      payload?.scoreboard?.events ||
      payload?.scoreboard?.liveCommentary ||
      payload?.scoreboard?.scorecard?.commentary ||
      payload?.liveStats?.commentary ||
      payload?.commentary,
  );

  return direct
    .map((entry) => ({
      over: toDisplayText(entry?.over || entry?.ball, DASH),
      text: String(entry?.text || entry?.commentary || entry?.event || "").trim(),
    }))
    .filter((entry) => entry.text)
    .slice(0, 120);
};

export const formatLastSixFromCommentary = (entries: CommentaryEntry[]): string => {
  const latest = [...entries].reverse();
  const balls: string[] = [];

  const extractTokensFromText = (textRaw: string) => {
    const text = String(textRaw || "").toLowerCase();
    if (!text) return [] as string[];

    // If text contains a clear 'last' or 'recent' series e.g. "last 6: 0 0 0 0 4 w"
    const seriesMatch = text.match(/(?:last|recent)\s*[:\-]?\s*([0-9wwdnbs,\s+.]+)/i);
    if (seriesMatch?.[1]) {
      const rawSeries = seriesMatch[1];
      return rawSeries
        .replace(/\+/g, "+")
        .split(/[\s,|]+/)
        .map((t) => normalizeBallToken(t))
        .filter(Boolean);
    }

    // Shortcut: map common dot/no-run phrases to a single '0'
    if (/no run|dot ball/.test(text)) {
      return ["0"];
    }

    // Look for comma/space separated tokens inside parentheses or after colon
    const tokens = text
      .replace(/[()]/g, " ")
      .split(/[\s,|]+/)
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => {
        if (/^\d+$/.test(t) && Number(t) <= 6) return t; // numeric run
        if (/^\d+\+\d+$/.test(t)) return t; // e.g., wd+2
        if (/^wd|wide/.test(t)) return "Wd";
        if (/^nb|no-?ball/.test(t)) return "Nb";
        if (/^w$|^out$|^wicket$|^caught$|^bowled$|^stumped$/.test(t)) return "W";
        if (/^four$/.test(t)) return "4";
        if (/^six$/.test(t)) return "6";
        // catch patterns like '1 run' or '2 runs'
        const runHit = t.match(/^(?:([0-6])\s*run)s?$/) || t.match(/^([0-6])$/);
        if (runHit?.[1]) return runHit[1];
        return "";
      })
      .filter(Boolean);

    return tokens;
  };

  for (const entry of latest) {
    if (balls.length >= 6) {
      break;
    }

    const tokens = extractTokensFromText(entry.text || entry?.commentary || "");
    if (tokens.length > 0) {
      // tokens are newest-first inside this entry; keep order as occurred
      for (const t of tokens) {
        if (balls.length >= 12) break;
        balls.push(t);
      }
    }
  }

  return balls.slice(0, 6).reverse().map(normalizeBallToken).filter(Boolean).join(" ");
};

export const getLastSixBalls = (payload: any): string[] => {
  const liveStats = payload?.scoreboard?.liveStats || payload?.liveStats || {};
  const direct = toTokenArray(
    liveStats?.lastSixBalls ||
      liveStats?.last6 ||
      liveStats?.recentBalls ||
      liveStats?.recentBallTokens ||
      liveStats?.lastSixBallsText ||
      liveStats?.currentOverBalls ||
      liveStats?.currentOverSummary,
  ).map(normalizeBallToken).filter(Boolean);

  // Try other common payload spots for deliveries
  const deliveryCandidates = [
    payload?.scoreboard?.deliveries,
    payload?.deliveries,
    payload?.scoreboard?.recentDeliveries,
  ];
  for (const cand of deliveryCandidates) {
    if (Array.isArray(cand) && cand.length > 0) {
      const tokens = toTokenArray(cand).map(normalizeBallToken).filter(Boolean);
      if (tokens.length > 0) return tokens.slice(-6);
    }
  }

  const derived = formatLastSixFromCommentary(getCommentaryEntries(payload));
  const derivedTokens = toTokenArray(derived).map(normalizeBallToken).filter(Boolean).slice(-6);

  if (direct.length === 0) {
    return derivedTokens;
  }

  const directLast = direct.slice(-6);
  const directAllDot = directLast.length > 0 && directLast.every((token) => token === "0");
  const derivedHasAction = derivedTokens.some((token) => token !== "0");
  if (directAllDot && derivedHasAction) {
    return derivedTokens;
  }

  return directLast;
};

const normalizeBallToken = (value: unknown) => {
  const token = String(value || "").trim();
  if (!token) {
    return "";
  }

  const normalized = token
    .replace(/\s+/g, "")
    .replace(/wide/gi, "Wd")
    .replace(/wicket/gi, "W")
    .replace(/out/gi, "W")
    .replace(/noball/gi, "Nb")
    .replace(/no-ball/gi, "Nb");

  if (/^wd\+\d+$/i.test(normalized)) {
    return `Wd+${normalized.split("+")[1]}`;
  }
  if (/^nb\+\d+$/i.test(normalized)) {
    return `Nb+${normalized.split("+")[1]}`;
  }
  if (/^w$/i.test(normalized)) {
    return "W";
  }
  if (/^wd$/i.test(normalized)) {
    return "Wd";
  }
  if (/^nb$/i.test(normalized)) {
    return "Nb";
  }

  return normalized;
};

export const getCurrentOverBalls = (payload: any): string[] => {
  const liveStats = payload?.scoreboard?.liveStats || payload?.liveStats || {};
  const direct = toTokenArray(
    liveStats?.currentOverBalls ||
      liveStats?.currentOver ||
      liveStats?.currentOverSummary ||
      liveStats?.lastSixBalls ||
      liveStats?.last6,
  )
    .map(normalizeBallToken)
    .filter(Boolean);

  const result = direct.slice(-6);
  while (result.length < 6) {
    result.push("");
  }
  return result;
};

export const getCurrentRunRate = (liveStats: any) =>
  readLiveStat(liveStats, ["crr", "currentRunRate", "runRate", "current_rr"]) || DASH;

export const getRequiredRunRate = (liveStats: any) =>
  readLiveStat(liveStats, ["rrr", "requiredRunRate", "required_rr"]) || DASH;

export const oversToBalls = (oversValue: unknown): number => {
  const raw = String(oversValue ?? "").trim();
  if (!raw || raw === DASH) return 0;

  // Prefer string parsing to avoid floating point issues like 237.00000000000003
  const hit = raw.match(/^(\d+)(?:\.(\d+))?$/);
  if (!hit) {
    const asNum = Number(raw);
    return Number.isFinite(asNum) ? Math.round(asNum) : 0;
  }

  const whole = Number(hit[1]);
  const part = String(hit[2] ?? "");
  const ballsPart = part ? Number(part.slice(0, 1)) : 0;
  if (!Number.isFinite(whole) || !Number.isFinite(ballsPart)) return 0;
  return whole * 6 + ballsPart;
};

export const getNeedSummary = (liveStats: any) => {
  const equation = readLiveStat(liveStats, ["equation", "chaseEquation"]);
  const neededRunsRaw = Number(liveStats?.neededRuns);
  const ballsRemainingRaw = Number(liveStats?.ballsRemaining);
  const neededRuns = Number.isFinite(neededRunsRaw) ? neededRunsRaw : null;
  const ballsRemaining = Number.isFinite(ballsRemainingRaw) ? ballsRemainingRaw : null;

  return {
    equation,
    neededRuns,
    ballsRemaining,
  };
};

export const getCurrentBatters = (payload: any): LiveBatter[] => {
  const scoreboard = payload?.scoreboard || payload || {};
  const liveStats = scoreboard?.liveStats || scoreboard || {};
  const inningsRows = safeArray<any>(scoreboard?.scorecard?.innings || scoreboard?.innings);
  const activeInning = inningsRows.at(-1) || null;

  // Only trust explicit live stats for current batters.
  const liveBatters = safeArray<any>(
    liveStats?.currentBatters || liveStats?.activeBatsmen || liveStats?.activeBatters
  );

  if (liveBatters.length > 0) {
    return liveBatters
      .filter((b) => b && (b.name || b.player || b.batter))
      .map((b, idx) => normalizeBatter(b, idx))
      .slice(0, 2);
  }

  // Fallback to scorecard only when dismissal info confirms "not out".
  const fallbackBatters = safeArray<any>(
    activeInning?.batting?.filter((b: any) => /not out/i.test(String(b?.dismissal || "")))
  );

  return fallbackBatters
    .filter((b) => b && (b.name || b.player || b.batter))
    .map((b, idx) => normalizeBatter(b, idx))
    .slice(0, 2);
};

export const getCurrentBowler = (payload: any): LiveBowler | null => {
  const scoreboard = payload?.scoreboard || payload || {};
  const liveStats = scoreboard?.liveStats || scoreboard || {};

  const bowler = liveStats?.currentBowler || liveStats?.activeBowler;

  if (!bowler || (!bowler.name && !bowler.player && !bowler.bowler)) return null;
  return normalizeBowler(bowler);
};

export const getLiveSummaryStats = (payload: any, targetText?: string) => {
  const liveStats = payload?.scoreboard?.liveStats || payload?.liveStats || {};
  const crr = getCurrentRunRate(liveStats);
  const rrr = getRequiredRunRate(liveStats);
  const partnership = toDisplayText(liveStats?.partnership);
  const lastWicket = toDisplayText(liveStats?.lastWicket);
  const projected = toDisplayText(liveStats?.projectedScore);
  const target = toDisplayText(targetText || liveStats?.target);
  
  // Refine partnership display to remove "runs off 0 balls"
  let displayPartnership = partnership;
  if (partnership.includes("off 0 balls") || partnership.includes("0(0)")) {
    displayPartnership = DASH;
  }

  return {
    crr,
    rrr,
    partnership: displayPartnership,
    lastWicket,
    projected,
    target,
  };
};

export const deriveTeamShort = (teamName?: string | null): string => {
  if (!teamName) {
    return "TBD";
  }

  const normalized = normalizeText(teamName);
  if (IPL_NAME_TO_SHORT[normalized]) {
    return IPL_NAME_TO_SHORT[normalized];
  }

  const words = teamName
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase())
    .filter(Boolean);

  return words.slice(0, 4).join("") || "TBD";
};

export const getTeamLogoProps = (teamName?: string | null) => {
  const short = deriveTeamShort(teamName);
  const teamId = SHORT_TO_TEAM_ID[short];

  if (teamId && getIplTeamByShort(short)) {
    return { teamId, short };
  }

  return { short };
};

export const isIplTeamName = (teamName?: string | null) => {
  const normalized = normalizeText(teamName);
  return Boolean(IPL_NAME_TO_SHORT[normalized]);
};

export const formatApiDate = (dateValue?: string | number | null) => {
  if (!dateValue) {
    return "TBD";
  }

  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) {
    return String(dateValue);
  }

  return parsed.toLocaleString();
};

export const isCompletedStatus = (status?: string | null) =>
  /(won|match over|result|completed|ended|beat|no result|draw|stumps)/i.test(String(status || ""));

export const isUpcomingStatus = (status?: string | null) =>
  /(upcoming|starts|yet to|scheduled|not started|fixture|toss)/i.test(String(status || ""));

export const isLiveStatus = (status?: string | null) =>
  /(live|in progress|innings break|break|playing)/i.test(String(status || ""));

export const slugify = (value?: string | null) =>
  normalizeText(value)
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "");
