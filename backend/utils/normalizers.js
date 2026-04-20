import { resolvePlayerImage, resolveTeamImage } from "./imageMapper.js";

const asArray = (value) => {
  const scheduleMatches = extractScheduleMatches(value);
  if (scheduleMatches.length > 0) {
    return scheduleMatches;
  }

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
  if (Array.isArray(value?.response)) {
    return value.response;
  }
  if (Array.isArray(value?.response?.data)) {
    return value.response.data;
  }
  if (Array.isArray(value?.response?.matches)) {
    return value.response.matches;
  }
  if (Array.isArray(value?.response?.teams)) {
    return value.response.teams;
  }
  if (Array.isArray(value?.response?.players)) {
    return value.response.players;
  }
  if (Array.isArray(value?.response?.series)) {
    return value.response.series;
  }
  return [];
};

const extractScheduleMatches = (value) => {
  const schedules = value?.response?.schedules;
  if (!Array.isArray(schedules)) {
    return [];
  }

  const flattened = [];

  for (const day of schedules) {
    const dayWrapper = day?.scheduleAdWrapper;
    const dayLabel = dayWrapper?.date;
    const dayLongDate = dayWrapper?.longDate;
    const matchScheduleList = dayWrapper?.matchScheduleList;
    if (!Array.isArray(matchScheduleList)) {
      continue;
    }

    for (const block of matchScheduleList) {
      const seriesName = block?.seriesName;
      const seriesId = block?.seriesId;
      const seriesCategory = block?.seriesCategory;
      const matchInfo = block?.matchInfo;
      if (!Array.isArray(matchInfo)) {
        continue;
      }

      for (const match of matchInfo) {
        flattened.push({
          ...match,
          seriesName,
          seriesId,
          seriesCategory,
          scheduleDate: dayLabel,
          scheduleLongDate: dayLongDate,
        });
      }
    }
  }

  return flattened;
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

  if (Array.isArray(raw?.score)) {
    const innings = raw.score
      .map((entry) => {
        const runs = entry?.r;
        const wickets = entry?.w;
        const overs = entry?.o;
        if (runs === undefined || wickets === undefined) {
          return null;
        }
        return overs !== undefined ? `${runs}/${wickets} (${overs})` : `${runs}/${wickets}`;
      })
      .filter(Boolean);

    if (innings.length > 0) {
      return innings.join(" | ");
    }
  }

  return null;
};

const deriveTeamsFromRaw = (raw) => {
  const team1 = getTeamName(pick(raw, ["team1", "teama", "homeTeam"]));
  const team2 = getTeamName(pick(raw, ["team2", "teamb", "awayTeam"]));

  if (team1 || team2) {
    return {
      team1,
      team2,
    };
  }

  if (Array.isArray(raw?.teams)) {
    return {
      team1: raw.teams[0] || null,
      team2: raw.teams[1] || null,
    };
  }

  return {
    team1: null,
    team2: null,
  };
};

const deriveVenue = (raw) => {
  const direct = pick(raw, ["venue", "ground", "location", "stadium"]);
  if (direct) {
    return direct;
  }

  const venueInfo = raw?.venueInfo;
  if (!venueInfo || typeof venueInfo !== "object") {
    return null;
  }

  const pieces = [venueInfo.ground, venueInfo.city, venueInfo.country].filter(Boolean);
  if (pieces.length === 0) {
    return null;
  }

  return pieces.join(", ");
};

export const normalizeMatch = (raw = {}) => {
  const teams = deriveTeamsFromRaw(raw);
  const team1Name = teams.team1;
  const team2Name = teams.team2;

  return {
    id: pick(raw, ["id", "matchid", "matchId", "match_id", "matchId"]),
    name: pick(raw, ["name", "matchName", "title", "matchDesc"]),
    series: pick(raw, ["seriesName", "series", "tournament", "competition", "event"]),
    team1: team1Name,
    team2: team2Name,
    team1Image: resolveTeamImage(team1Name),
    team2Image: resolveTeamImage(team2Name),
    score: deriveScore(raw),
    status: pick(raw, ["status", "matchStatus", "state", "result", "stateTitle", "statusText"]),
    venue: deriveVenue(raw),
    date: pick(raw, ["date", "matchDate", "startTime", "start_time", "timestamp", "startDate", "scheduleLongDate", "dateTimeGMT"]),
    format: pick(raw, ["format", "matchType", "type", "matchFormat"]),
    matchStarted: raw?.matchStarted,
    matchEnded: raw?.matchEnded,
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

export const isIplText = (value = "") => {
  const text = String(value || "").toLowerCase();
  return /\bipl\b/.test(text) || text.includes("indian premier league");
};
