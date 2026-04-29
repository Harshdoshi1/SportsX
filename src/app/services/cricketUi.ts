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
  "royal challengers bangalore": "RCB",
  "kolkata knight riders": "KKR",
  "delhi capitals": "DC",
  "sunrisers hyderabad": "SRH",
  "punjab kings": "PBKS",
  "rajasthan royals": "RR",
  "gujarat titans": "GT",
  "lucknow super giants": "LSG",
  "mi": "MI",
  "csk": "CSK",
  "rcb": "RCB",
  "kkr": "KKR",
  "dc": "DC",
  "srh": "SRH",
  "pbks": "PBKS",
  "rr": "RR",
  "gt": "GT",
  "lsg": "LSG",
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

const splitCompactScore = (tail: string) => {
  const compact = String(tail || "").trim();
  const hit = compact.match(/^(\d+)\.(\d+)$/);
  if (!hit) {
    return null;
  }

  const whole = hit[1];
  const decimal = hit[2];

  for (const wicketDigits of [2, 1]) {
    if (whole.length <= wicketDigits) {
      continue;
    }
    const wickets = whole.slice(0, wicketDigits);
    const oversWhole = whole.slice(wicketDigits);
    const wicketsNum = Number(wickets);
    const decimalNum = Number(decimal);
    if (!Number.isFinite(wicketsNum) || wicketsNum < 0 || wicketsNum > 10) {
      continue;
    }
    if (!Number.isFinite(decimalNum) || decimalNum < 0 || decimalNum > 9) {
      continue;
    }
    if (!oversWhole) {
      continue;
    }
    return {
      wickets,
      overs: `${Number(oversWhole)}.${decimal}`,
    };
  }

  return null;
};

export const parseRunsAndOvers = (value: unknown): ScoreDisplay => {
  const raw = String(value || "").trim();
  if (!raw) {
    return { runsText: DASH, oversText: "" };
  }

  const compact = raw.match(/^\s*(\d{1,3})\s*[-/]\s*([0-9]+\.[0-9]+)\s*$/);
  if (compact) {
    const runs = String(compact[1] || "").trim();
    const split = splitCompactScore(String(compact[2] || ""));
    if (split) {
      return {
        runsText: `${runs}-${split.wickets}`,
        oversText: split.overs,
      };
    }
  }

  const match = raw.match(/^\s*([0-9]+\s*[-/]\s*[0-9]+|[0-9]+)\s*(?:\(([^)]+)\))?\s*$/);
  if (match) {
    return {
      runsText: toDisplayText(match[1], DASH),
      oversText: String(match[2] || "").trim(),
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
  isOnStrike: Boolean(row?.isOnStrike || row?.strike || index === 0),
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
  const directScorecardInnings = safeArray<any>(payload?.scorecard?.innings);
  const nestedScorecardInnings = safeArray<any>(payload?.scoreboard?.scorecard?.innings);
  const scorecardInnings =
    directScorecardInnings.length > 0 ? directScorecardInnings : nestedScorecardInnings;

  if (scorecardInnings.length === 0) {
    return buildFallbackInnings(payload);
  }

  return scorecardInnings.slice(0, 8).map((inning, index) => {
    const parsed = parseRunsAndOvers(inning?.score || `${inning?.runs ?? ""}-${inning?.wickets ?? ""}`);
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
      payload?.commentary,
  );

  return direct
    .map((entry) => ({
      over: toDisplayText(entry?.over || entry?.ball, DASH),
      text: String(entry?.text || entry?.commentary || entry?.event || "").trim(),
    }))
    .filter((entry) => entry.text)
    .slice(0, 40);
};

export const formatLastSixFromCommentary = (entries: CommentaryEntry[]): string => {
  const latest = [...entries].reverse();
  const balls: string[] = [];

  for (const entry of latest) {
    if (balls.length >= 12) { // Look further back to ensure we get enough balls
      break;
    }

    const text = String(entry.text || "").toLowerCase();
    if (!text) {
      continue;
    }

    // Match patterns like "1 run", "4 runs", "OUT", "no run", "wide", etc.
    if (/wide/.test(text)) {
      balls.push("Wd");
      continue;
    }
    if (/no\s*ball|noball/.test(text)) {
      balls.push("Nb");
      continue;
    }
    if (/out|wicket|caught|lbw|bowled|run out|stumped/.test(text)) {
      balls.push("W");
      continue;
    }
    if (/six/.test(text) || /\b6\b/.test(text)) {
      balls.push("6");
      continue;
    }
    if (/four/.test(text) || /\b4\b/.test(text)) {
      balls.push("4");
      continue;
    }
    const runHit = text.match(/\b([0-6])\s*runs?\b/);
    if (runHit?.[1]) {
      balls.push(runHit[1]);
      continue;
    }
    if (/no run|dot ball|\b0\b/.test(text)) {
      balls.push("0");
      continue;
    }

    // Fallback for simple numeric results in commentary
    const singleDigit = text.match(/^\s*([0-6wW])\s*$/);
    if (singleDigit?.[1]) {
      balls.push(singleDigit[1].toUpperCase());
    }
  }

  return balls.slice(0, 6).reverse().join(" ");
};

export const getLastSixBalls = (payload: any): string[] => {
  const liveStats = payload?.scoreboard?.liveStats || payload?.liveStats || {};
  const direct = toTokenArray(liveStats?.lastSixBalls || liveStats?.last6 || liveStats?.recentBalls);
  if (direct.length > 0) {
    return direct.slice(-6);
  }

  const derived = formatLastSixFromCommentary(getCommentaryEntries(payload));
  return toTokenArray(derived).slice(-6);
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
  const scorecardInnings = getScorecardInnings(payload);
  const inningsBatters = scorecardInnings.flatMap((inning) => inning.batting).filter((row) => row.name !== DASH);
  if (inningsBatters.length > 0) {
    return inningsBatters.slice(0, 2);
  }

  return safeArray<any>(payload?.scoreboard?.batters)
    .map(normalizeBatter)
    .filter((row) => row.name !== DASH)
    .slice(0, 2);
};

export const getCurrentBowler = (payload: any): LiveBowler | null => {
  const scorecardInnings = getScorecardInnings(payload);
  const inningsBowler = scorecardInnings.flatMap((inning) => inning.bowling).find((row) => row.name !== DASH);
  if (inningsBowler) {
    return inningsBowler;
  }

  const rootBowler = safeArray<any>(payload?.scoreboard?.bowlers).map(normalizeBowler)[0];
  return rootBowler || null;
};

export const getLiveSummaryStats = (payload: any, targetText?: string) => {
  const liveStats = payload?.scoreboard?.liveStats || payload?.liveStats || {};
  const crr = getCurrentRunRate(liveStats);
  const rrr = getRequiredRunRate(liveStats);
  const partnership = toDisplayText(liveStats?.partnership);
  const lastWicket = toDisplayText(liveStats?.lastWicket);
  const projected = toDisplayText(liveStats?.projectedScore);
  const target = toDisplayText(targetText || liveStats?.target);

  return {
    crr,
    rrr,
    partnership,
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
