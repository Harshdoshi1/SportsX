import { resolvePlayerImage, resolveTeamImage } from "./imageMapper.js";

const asArray = (value) => {
  if (Array.isArray(value)) {
    return value;
  }
  if (Array.isArray(value?.data)) {
    return value.data;
  }
  if (Array.isArray(value?.response)) {
    return value.response;
  }
  if (Array.isArray(value?.matches)) {
    return value.matches;
  }
  if (Array.isArray(value?.series)) {
    return value.series;
  }
  if (Array.isArray(value?.teams)) {
    return value.teams;
  }
  if (Array.isArray(value?.players)) {
    return value.players;
  }
  return [];
};

const pick = (source, keys, fallback = null) => {
  for (const key of keys) {
    if (source?.[key] !== undefined && source?.[key] !== null && source?.[key] !== "") {
      return source[key];
    }
  }
  return fallback;
};

const getTeamName = (value) => {
  if (!value) {
    return null;
  }
  if (typeof value === "string") {
    return value;
  }
  return pick(value, ["name", "teamName", "short_name", "shortName"]);
};

const deriveScore = (raw) => {
  const score = pick(raw, ["score", "matchScore", "scoreText"]);
  if (score) {
    return score;
  }

  const team1Score = pick(raw, ["team1Score", "teamaScore", "scoreA"]);
  const team2Score = pick(raw, ["team2Score", "teambScore", "scoreB"]);
  if (team1Score || team2Score) {
    return [team1Score, team2Score].filter(Boolean).join(" | ");
  }

  return null;
};

export const normalizeMatch = (raw = {}) => {
  const team1Name = getTeamName(pick(raw, ["team1", "teama", "homeTeam"]));
  const team2Name = getTeamName(pick(raw, ["team2", "teamb", "awayTeam"]));

  return {
    id: pick(raw, ["id", "matchid", "matchId", "match_id"]),
    name: pick(raw, ["name", "matchName", "title"]),
    series: pick(raw, ["seriesName", "series", "tournament", "competition", "event"]),
    team1: team1Name,
    team2: team2Name,
    team1Image: resolveTeamImage(team1Name),
    team2Image: resolveTeamImage(team2Name),
    score: deriveScore(raw),
    status: pick(raw, ["status", "matchStatus", "state", "result"]),
    venue: pick(raw, ["venue", "ground", "location", "stadium"]),
    date: pick(raw, ["date", "matchDate", "startTime", "start_time", "timestamp"]),
    format: pick(raw, ["format", "matchType", "type"]),
    raw,
  };
};

export const normalizeSeries = (raw = {}) => ({
  id: pick(raw, ["id", "seriesid", "seriesId"]),
  name: pick(raw, ["name", "seriesName", "title"]),
  startDate: pick(raw, ["startDate", "start_date"]),
  endDate: pick(raw, ["endDate", "end_date"]),
  category: pick(raw, ["category", "type"]),
  raw,
});

export const normalizeTeam = (raw = {}) => {
  const name = pick(raw, ["name", "teamName", "title"]);

  return {
    id: pick(raw, ["id", "teamid", "teamId"]),
    name,
    shortName: pick(raw, ["shortName", "short_name", "abbr"]),
    image: resolveTeamImage(name) || pick(raw, ["image", "img", "logo"]),
    raw,
  };
};

export const normalizePlayer = (raw = {}, teamName = null) => {
  const name = pick(raw, ["name", "playerName", "title"]);
  const playerTeam = teamName || pick(raw, ["team", "teamName", "country"]);

  return {
    id: pick(raw, ["id", "playerid", "playerId"]),
    name,
    team: playerTeam,
    role: pick(raw, ["role", "playingRole", "type"]),
    image: resolvePlayerImage(name) || pick(raw, ["image", "img", "avatar"]),
    raw,
  };
};

export const normalizeMatchList = (payload) => asArray(payload).map(normalizeMatch);
export const normalizeSeriesList = (payload) => asArray(payload).map(normalizeSeries);
export const normalizeTeamList = (payload) => asArray(payload).map(normalizeTeam);
export const normalizePlayerList = (payload, teamName) =>
  asArray(payload).map((player) => normalizePlayer(player, teamName));

export const isIplText = (value = "") => /\bipl\b/i.test(String(value));
