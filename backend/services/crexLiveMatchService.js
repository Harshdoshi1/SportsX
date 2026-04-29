import puppeteer from "puppeteer";
import crypto from "node:crypto";
import { supabaseLiveScoreCacheService } from "./supabaseLiveScoreCacheService.js";

const LIVE_MATCH_SOURCES = [
  {
    sourceId: "icc-wct-11lo",
    tournamentId: "icc",
    series: "Women's Challenge Trophy 2026",
    sourceUrl:
      "https://crex.com/cricket-live-score/ita-w-vs-usa-w-10th-match-womens-challenge-trophy-2026-match-updates-11LO",
  },
  {
    sourceId: "ipl-118f",
    tournamentId: "ipl",
    series: "Indian Premier League 2026",
    sourceUrl:
      "https://crex.com/cricket-live-score/gt-vs-rcb-34th-match-indian-premier-league-2026-match-updates-118F",
  },
];

const CACHE_TTL_MS = 12_000;
const cacheByMatchId = new Map();
const inFlightByMatchId = new Map();

let sharedBrowserPromise = null;

const normalizeSourceUrl = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return raw.replace(/\/+$/, "");
};

const toScorecardUrl = (sourceUrl) => {
  const base = normalizeSourceUrl(sourceUrl);
  if (!base) return "";
  if (base.toLowerCase().includes("/match-scorecard")) {
    return base;
  }
  return `${base}/match-scorecard`;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const stripHtml = (value) =>
  String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

const decodeEmbedded = (value) =>
  String(value || "")
    .replace(/&q;/g, '"')
    .replace(/&s;/g, "'")
    .replace(/&l;/g, "<")
    .replace(/&g;/g, ">")
    .replace(/\\\"/g, '"');

const findEmbeddedChunk = (text) => {
  const raw = String(text || "");
  const marker = "{&q;https://stats.crickapi.com/live/getMatchMetaData&q;:";
  const start = raw.indexOf(marker);
  if (start < 0) {
    return "";
  }

  let depth = 0;
  let out = "";
  for (let i = start; i < raw.length; i += 1) {
    const ch = raw[i];
    out += ch;
    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        break;
      }
    }
  }

  return out;
};

const readEncodedField = (blob, key) => {
  const source = String(blob || "");
  const quoted = source.match(new RegExp(`&q;${key}&q;:&q;([^&]*?)&q;`));
  if (quoted?.[1] != null) {
    return stripHtml(decodeEmbedded(quoted[1]));
  }

  const numeric = source.match(new RegExp(`&q;${key}&q;:([0-9.]+)`));
  if (numeric?.[1] != null) {
    return String(numeric[1]);
  }

  return null;
};

const toBallCount = (value) => String(value || "").replace(/[^0-9]/g, "");

const parseStructuredLiveData = (pageText) => {
  const blob = findEmbeddedChunk(pageText);
  if (!blob) {
    return null;
  }

  const team1 = readEncodedField(blob, "team1short") || readEncodedField(blob, "team1") || null;
  const team2 = readEncodedField(blob, "team2short") || readEncodedField(blob, "team2") || null;
  const team1Full = readEncodedField(blob, "team1_f_n") || null;
  const team2Full = readEncodedField(blob, "team2_f_n") || null;
  const score1 = readEncodedField(blob, "score1");
  const over1 = readEncodedField(blob, "over1");
  const score2 = readEncodedField(blob, "score2");
  const over2 = readEncodedField(blob, "over2");

  const batter1Name = readEncodedField(blob, "pname1");
  const batter1Runs = readEncodedField(blob, "run1");
  const batter1Balls = toBallCount(readEncodedField(blob, "ball1"));
  const batter2Name = readEncodedField(blob, "pname2");
  const batter2Runs = readEncodedField(blob, "run2");
  const batter2Balls = toBallCount(readEncodedField(blob, "ball2"));

  const bowlerName = readEncodedField(blob, "bname") || readEncodedField(blob, "lbname") || null;
  const bowlerFigures = readEncodedField(blob, "bwr") || readEncodedField(blob, "lbwicket") || null;
  const bowlerOvers = readEncodedField(blob, "bover") || toBallCount(readEncodedField(blob, "lbover")) || null;

  const partnerRuns = readEncodedField(blob, "partnerruns");
  const partnerBalls = readEncodedField(blob, "partnerballs");
  const lastWicketName = readEncodedField(blob, "lwname1");
  const lastWicketRuns = readEncodedField(blob, "lwrun1");
  const lastWicketBalls = toBallCount(readEncodedField(blob, "lwball1"));

  const crr = readEncodedField(blob, "crr");
  const rrr = readEncodedField(blob, "rrr");
  const equation = readEncodedField(blob, "comment1");

  const innings = [
    { title: `${team1 || "Team 1"} Innings`, team: team1, score: score1, overs: over1 || "-" },
    { title: `${team2 || "Team 2"} Innings`, team: team2, score: score2, overs: over2 || "-" },
  ].filter((item) => item.score);

  const batters = [
    batter1Name && batter1Runs != null
      ? { name: batter1Name, runs: Number(batter1Runs) || 0, balls: Number(batter1Balls) || 0 }
      : null,
    batter2Name && batter2Runs != null
      ? { name: batter2Name, runs: Number(batter2Runs) || 0, balls: Number(batter2Balls) || 0 }
      : null,
  ].filter(Boolean);

  const bowlers = bowlerName
    ? [
        {
          name: bowlerName,
          figures: bowlerFigures || "-",
          overs: String(bowlerOvers || "-").replace(/^\(+|\)+$/g, ""),
        },
      ]
    : [];

  return {
    team1,
    team2,
    team1Full,
    team2Full,
    team1Score: score1 || null,
    team2Score: score2 || null,
    team1Overs: over1 || null,
    team2Overs: over2 || null,
    innings,
    batters,
    bowlers,
    liveStats: {
      currentRunRate: crr || null,
      requiredRunRate: rrr || null,
      tossInfo: null,
      partnership: partnerRuns && partnerBalls ? `${partnerRuns}(${partnerBalls})` : null,
      lastWicket:
        lastWicketName && lastWicketRuns != null
          ? `${lastWicketName} ${lastWicketRuns}${lastWicketBalls ? `(${lastWicketBalls})` : ""}`
          : null,
      equation: equation || null,
    },
  };
};

const extractCrexCode = (url) =>
  String(url || "")
    .match(/match-updates-([A-Za-z0-9]+)/i)?.[1]
    ?.toLowerCase() || "live";

const hashUrl = (value) => crypto.createHash("md5").update(String(value || "")).digest("hex").slice(0, 10);

const inferTournamentId = (sourceUrl, fallback = "admin") => {
  const raw = String(sourceUrl || "").toLowerCase();
  if (raw.includes("indian-premier-league") || raw.includes("-ipl-") || raw.includes("/ipl")) {
    return "ipl";
  }
  if (raw.includes("icc")) {
    return "icc";
  }
  return String(fallback || "admin").toLowerCase();
};

const buildSourceFromUrl = (sourceUrl, defaults = {}) => {
  const normalized = normalizeSourceUrl(sourceUrl);
  const tournamentId = inferTournamentId(normalized, defaults?.tournamentId || "admin");
  const code = extractCrexCode(normalized);
  return {
    sourceId: defaults?.sourceId || `${tournamentId}-${code}-${hashUrl(normalized)}`,
    tournamentId,
    series: String(defaults?.series || "Live Feed").trim(),
    sourceUrl: normalized,
  };
};

const buildMatchId = (source) => `${source.tournamentId}-${extractCrexCode(source.sourceUrl)}`;

const sourceByMatchId = new Map(LIVE_MATCH_SOURCES.map((source) => [buildMatchId(source), source]));

const parseTeamsFromUrl = (url) => {
  const slug = String(url || "");
  const match = slug.match(/\/cricket-live-score\/([^/]+)-match-updates-/i);
  const left = match?.[1] || "";
  const parts = left.split("-vs-");
  if (parts.length !== 2) {
    return { team1: "Team A", team2: "Team B" };
  }

  return {
    team1: parts[0].toUpperCase(),
    team2: parts[1].toUpperCase(),
  };
};

const parseTeamsFromHeading = (line) => {
  const raw = String(line || "").replace(/\s+/g, " ").trim();
  const match = raw.match(/([A-Za-z0-9-]+)\s+Vs\s+([A-Za-z0-9-]+)/i);
  if (!match) {
    return null;
  }

  return {
    team1: String(match[1] || "").toUpperCase(),
    team2: String(match[2] || "").toUpperCase(),
  };
};

const normalizeScoreToken = (value) => String(value || "").replace(/\s+/g, "").trim();

const findScoreForTeam = (lines, teamToken) => {
  const token = String(teamToken || "").toLowerCase();
  const scoreRegex = /(\d{1,3}\s*[-/]\s*\d{1,2}(?:\s*\(?\d{1,2}(?:\.\d+)?\)?(?:\s*ov)?\s*)?)/i;

  for (let i = 0; i < lines.length; i += 1) {
    const line = String(lines[i] || "");
    const normalized = line.toLowerCase();
    if (!normalized.includes(token) || /\bvs\b/.test(normalized)) {
      continue;
    }

    const sameLineHit = line.match(scoreRegex);
    if (sameLineHit?.[1]) {
      return sameLineHit[1].replace(/\s+/g, " ").trim();
    }

    for (let j = i + 1; j <= i + 2 && j < lines.length; j += 1) {
      const nextLineHit = String(lines[j] || "").match(scoreRegex);
      if (nextLineHit?.[1]) {
        return nextLineHit[1].replace(/\s+/g, " ").trim();
      }
    }
  }

  return null;
};

const uniqueByKey = (items, keyFn) => {
  const seen = new Set();
  const out = [];

  for (const item of items) {
    const key = keyFn(item);
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(item);
  }

  return out;
};

const parsePrimaryScoreLine = (lines, team1, team2) => {
  const scoreRegex = /\b([A-Z]{2,}(?:-[A-Z])?)\s+(\d{1,3}\s*[-/]\s*\d{1,2})\s*(\d{1,2}(?:\.\d+)?)?/i;
  const items = [];

  for (const line of lines) {
    const hit = String(line || "").match(scoreRegex);
    if (!hit) {
      continue;
    }

    const token = String(hit[1] || "").toUpperCase();
    const score = normalizeScoreToken(hit[2]);
    const overs = String(hit[3] || "").trim() || null;
    if (!score) {
      continue;
    }

    items.push({ token, score, overs, line: String(line || "") });
  }

  const uniq = uniqueByKey(items, (item) => `${item.token}:${item.score}:${item.overs || "-"}`);
  const team1Score = uniq.find((item) => item.token === team1)?.score || null;
  const team2Score = uniq.find((item) => item.token === team2)?.score || null;
  const team1Overs = uniq.find((item) => item.token === team1)?.overs || null;
  const team2Overs = uniq.find((item) => item.token === team2)?.overs || null;

  return {
    team1Score,
    team2Score,
    team1Overs,
    team2Overs,
    rawLine: uniq[0]?.line || "",
  };
};

const parseBatters = (text) => {
  const rows = [];
  const raw = String(text || "").replace(/\s+/g, " ");
  const regex = /\b([A-Z](?:\.|[a-z]+)?\s+[A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+)*)\s+(\d{1,3})\s*\((\d{1,3})\)/g;

  let hit;
  while ((hit = regex.exec(raw)) !== null) {
    const name = String(hit[1] || "").trim();
    if (!name || /last wkt|partnership|over\s+\d+/i.test(name)) {
      continue;
    }
    rows.push({
      name,
      runs: Number(hit[2]),
      balls: Number(hit[3]),
    });
  }

  return uniqueByKey(rows, (row) => `${row.name}:${row.runs}:${row.balls}`).slice(0, 22);
};

const parseBowlers = (text) => {
  const rows = [];
  const raw = String(text || "").replace(/\s+/g, " ");
  const regex = /\b([A-Z](?:\.|[a-z]+)?\s+[A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+)*)\s+(\d{1,2}-\d{1,3})\s*\((\d{1,2}(?:\.\d+)?)\)/g;

  let hit;
  while ((hit = regex.exec(raw)) !== null) {
    rows.push({
      name: String(hit[1] || "").trim(),
      figures: String(hit[2] || "").trim(),
      overs: String(hit[3] || "").trim(),
    });
  }

  return uniqueByKey(rows, (row) => `${row.name}:${row.figures}:${row.overs}`).slice(0, 22);
};

const parseScorecardInnings = (lines) => {
  const rows = [];
  const regex = /\b([A-Z]{2,}(?:-[A-Z])?)\s+(\d{1,3}[-/]\d{1,2})\s*(?:\((\d{1,2}(?:\.\d+)?)\s*(?:ov|overs)?\))?/i;

  for (const line of lines) {
    const hit = String(line || "").match(regex);
    if (!hit) continue;
    rows.push({
      team: String(hit[1] || "").trim(),
      score: String(hit[2] || "").trim(),
      overs: String(hit[3] || "-").trim(),
    });
  }

  return uniqueByKey(rows, (row) => `${row.team}:${row.score}:${row.overs}`)
    .slice(0, 8)
    .map((row) => ({
      title: `${row.team} Innings`,
      team: row.team,
      score: row.score,
      overs: row.overs,
    }));
};

const parseScorecardPayload = (text) => {
  const normalized = String(text || "").replace(/\r/g, "");
  const lines = normalized
    .split("\n")
    .map((line) => String(line || "").replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const innings = parseScorecardInnings(lines);
  const batters = parseBatters(normalized);
  const bowlers = parseBowlers(normalized);

  return {
    innings,
    batters,
    bowlers,
  };
};

const scrapeScorecardPage = async (browser, sourceUrl) => {
  const scorecardUrl = toScorecardUrl(sourceUrl);
  if (!scorecardUrl) {
    return null;
  }

  const page = await browser.newPage();
  await configurePage(page);
  try {
    await page.goto(scorecardUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
    await sleep(1200);
    const bodyText = await page.evaluate(() => String(document.body?.innerText || ""));
    return parseScorecardPayload(bodyText);
  } catch {
    return null;
  } finally {
    await page.close();
  }
};

const parseCommentary = (text) => {
  const raw = String(text || "")
    .replace(/\s+/g, " ")
    .replace(/\d+(?:\.\d+)?K/g, "")
    .trim();

  const pieces = raw.split(/(?=\b\d{1,2}\.\d\b)/g);
  const rows = [];

  for (const piece of pieces) {
    const trimmed = String(piece || "").trim();
    const hit = trimmed.match(/^(\d{1,2}\.\d)\s+(.+)$/);
    if (!hit) {
      continue;
    }

    const over = hit[1];
    const textPart = String(hit[2] || "")
      .replace(/\s+/g, " ")
      .replace(/^[-:]+\s*/, "")
      .trim();

    if (!textPart || textPart.length < 4) {
      continue;
    }

    rows.push({ over, text: textPart.slice(0, 220) });
  }

  return uniqueByKey(rows, (row) => `${row.over}:${row.text}`).slice(0, 25);
};

const parseStatus = (text) => {
  const raw = String(text || "").toLowerCase();
  if (!raw) return "Live";
  if (/live|in progress|innings break/.test(raw)) return "Live";
  if (/won|result|completed|stumps/.test(raw)) return "Completed";
  if (/scheduled|starts|upcoming|toss/.test(raw)) return "Upcoming";
  return "Live";
};

const pickFirstMatch = (value, patterns) => {
  const raw = String(value || "");
  for (const pattern of patterns) {
    const hit = raw.match(pattern);
    if (hit) {
      return hit;
    }
  }
  return null;
};

const launchBrowser = async () =>
  puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

const getSharedBrowser = async () => {
  if (!sharedBrowserPromise) {
    sharedBrowserPromise = launchBrowser().catch((error) => {
      sharedBrowserPromise = null;
      throw error;
    });
  }
  return sharedBrowserPromise;
};

const configurePage = async (page) => {
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  );
  await page.setExtraHTTPHeaders({
    "accept-language": "en-US,en;q=0.9",
  });
  await page.setViewport({ width: 1366, height: 900 });
};

const scrapeCrexMatch = async (source) => {
  const fallbackTeams = parseTeamsFromUrl(source.sourceUrl);
  const browser = await getSharedBrowser();
  const page = await browser.newPage();
  try {
    await configurePage(page);

    await page.goto(source.sourceUrl, { waitUntil: "networkidle2", timeout: 60000 });
    await sleep(1500);

    const payload = await page.evaluate(() => {
      const text = String(document.body?.innerText || "");
      const lines = text
        .split("\n")
        .map((line) => String(line || "").replace(/\s+/g, " ").trim())
        .filter(Boolean);

      return { text, lines };
    });

    const scorecardPayload = await scrapeScorecardPage(browser, source.sourceUrl);

    const lines = payload?.lines || [];
    const pageText = String(payload?.text || "");
    const headingLine =
      lines.find((line) => /\bVs\b/i.test(line) && /live/i.test(line)) ||
      lines.find((line) => /\bVs\b/i.test(line)) ||
      "";
    const teams = parseTeamsFromHeading(headingLine) || fallbackTeams;
    const structured = parseStructuredLiveData(pageText);

    const statusLine =
      lines.find((line) => /live|innings break|stumps|won by|match tied|result|scheduled|starts in/i.test(line)) ||
      "Live";

    const venueLine =
      lines.find((line) => /stadium|ground|,\s*[A-Za-z]/i.test(line) && !/\bvs\b/i.test(line) && line.length < 140) ||
      "Venue unavailable";

    const dateLine =
      lines.find((line) => /\b\d{1,2}\s+[A-Za-z]{3}\s+\d{4}\b|today|tomorrow/i.test(line)) ||
      "Live";

    const scoreFromTeams = {
      team1Score: findScoreForTeam(lines, teams.team1),
      team2Score: findScoreForTeam(lines, teams.team2),
    };
    const scoreLine = parsePrimaryScoreLine(lines, teams.team1, teams.team2);
    const team1Score = structured?.team1Score || scoreLine.team1Score || scoreFromTeams.team1Score || null;
    const team2Score = structured?.team2Score || scoreLine.team2Score || scoreFromTeams.team2Score || null;
    const genericScore =
      lines
        .map((line) => line.match(/\b([A-Z]{2,}(?:-[A-Z])?)\s+(\d{1,3}\s*[-/]\s*\d{1,2}(?:\.?\d+)?)/i))
        .find(Boolean)?.[2] || null;

    const matchId = buildMatchId(source);

    const currentRunRate =
      structured?.liveStats?.currentRunRate || pageText.match(/CRR\s*:\s*([0-9.]+)/i)?.[1] || null;
    const requiredRunRate =
      structured?.liveStats?.requiredRunRate || pageText.match(/RRR\s*:\s*([0-9.]+)/i)?.[1] || null;

    const equationFallback =
      structured?.liveStats?.equation ||
      pickFirstMatch(pageText, [
        /Need\s+\d+\s+runs?\s+in\s+\d+\s+balls?[^\n]*/i,
        /Req(?:uired)?\s+\d+\s+in\s+\d+\s+balls?[^\n]*/i,
      ])?.[0] ||
      null;

    const needHit = equationFallback
      ? equationFallback.match(/Need\s+(\d+)\s+runs?\s+in\s+(\d+)\s+balls?/i)
      : null;
    const neededRuns = needHit ? Number(needHit[1]) : null;
    const ballsRemaining = needHit ? Number(needHit[2]) : null;

    const lastSixText =
      pickFirstMatch(pageText, [
        /Last\s*6\s*balls\s*:?\s*([^\n]+)/i,
        /Last\s*Six\s*Balls\s*:?\s*([^\n]+)/i,
      ])?.[1]?.trim() || null;
    const tossInfo = pageText.match(/([A-Z]{2,}(?:-[A-Z])?\s+opt\s+to\s+(?:Bat|Bowl))/i)?.[1] || null;
    const partnership =
      structured?.liveStats?.partnership || pageText.match(/P'?ship\s*:\s*([^\n]+)/i)?.[1]?.trim() || null;
    const lastWicket =
      structured?.liveStats?.lastWicket || pageText.match(/Last\s*Wkt\s*:\s*([^\n]+)/i)?.[1]?.trim() || null;
    const batters = scorecardPayload?.batters?.length
      ? scorecardPayload.batters
      : structured?.batters?.length
        ? structured.batters
        : parseBatters(pageText);
    const bowlers = scorecardPayload?.bowlers?.length
      ? scorecardPayload.bowlers
      : structured?.bowlers?.length
        ? structured.bowlers
        : parseBowlers(pageText);
    const commentary = parseCommentary(pageText);

    const innings =
      scorecardPayload?.innings?.length > 0
        ? scorecardPayload.innings
        : structured?.innings?.length > 0
          ? structured.innings
        : [
            {
              title: `${teams.team1} Innings`,
              team: teams.team1,
              score: team1Score,
              overs: scoreLine.team1Overs || "-",
            },
            {
              title: `${teams.team2} Innings`,
              team: teams.team2,
              score: team2Score,
              overs: scoreLine.team2Overs || "-",
            },
          ].filter((item) => item.score);

    return {
      id: matchId,
      sourceUrl: source.sourceUrl,
      sport: "cricket",
      series: source.series,
      team1: structured?.team1 || teams.team1,
      team2: structured?.team2 || teams.team2,
      team1Name: structured?.team1 || teams.team1,
      team2Name: structured?.team2 || teams.team2,
      team1Score,
      team2Score,
      team1Overs: structured?.team1Overs || scoreLine.team1Overs || null,
      team2Overs: structured?.team2Overs || scoreLine.team2Overs || null,
      score:
        team1Score || team2Score
          ? `${team1Score || "-"} · ${team2Score || "-"}`
          : genericScore || "Score unavailable",
      status: parseStatus(statusLine),
      date: dateLine,
      startTime: "",
      venue: venueLine,
      result: /won by|result/i.test(pageText) ? statusLine : null,
      tournamentId: source.tournamentId,
      fetchedAt: new Date().toISOString(),
      scoreboard: {
        innings,
        events: commentary,
        commentary,
        batters,
        bowlers,
        liveStats: {
          currentRunRate,
          requiredRunRate,
          tossInfo,
          partnership,
          lastWicket,
          equation: equationFallback,
          neededRuns,
          ballsRemaining,
          lastSixBalls: lastSixText,
        },
      },
    };
  } finally {
    await page.close();
  }
};

const readMatchFromSource = async (source, options = {}) => {
  const matchId = buildMatchId(source);
  const normalizedUrl = normalizeSourceUrl(source?.sourceUrl);
  const forceFresh = Boolean(options?.forceFresh);
  const now = Date.now();
  const cached = cacheByMatchId.get(matchId);

  if (!forceFresh && cached?.data && cached.expiresAt > now) {
    return {
      ...cached.data,
      _meta: {
        cacheHit: true,
        stale: Boolean(cached?.stale),
      },
    };
  }

  if (!forceFresh && inFlightByMatchId.has(matchId)) {
    const pending = await inFlightByMatchId.get(matchId);
    return {
      ...pending,
      _meta: {
        cacheHit: true,
        stale: Boolean(pending?._meta?.stale),
      },
    };
  }

  if (!forceFresh && normalizedUrl) {
    const fromSupabase = await supabaseLiveScoreCacheService.getSnapshotBySourceUrl(normalizedUrl, {
      maxAgeMs: 20_000,
    });
    if (fromSupabase?.payload?.match) {
      const payloadMatch = fromSupabase.payload.match;
      cacheByMatchId.set(matchId, {
        data: payloadMatch,
        expiresAt: Date.now() + CACHE_TTL_MS,
        stale: Boolean(fromSupabase?.stale),
      });
      return {
        ...payloadMatch,
        _meta: {
          cacheHit: true,
          stale: Boolean(fromSupabase?.stale),
          source: "supabase",
        },
      };
    }
  }

  const request = (async () => {
    try {
      const freshMatch = await scrapeCrexMatch(source);
      cacheByMatchId.set(matchId, {
        data: freshMatch,
        expiresAt: Date.now() + CACHE_TTL_MS,
        stale: false,
      });

      await supabaseLiveScoreCacheService.upsertSnapshot(matchId, {
        match: freshMatch,
        scoreboard: freshMatch?.scoreboard || {},
      });

      return {
        ...freshMatch,
        _meta: {
          cacheHit: false,
          stale: false,
        },
      };
    } catch (error) {
      if (cached?.data) {
        return {
          ...cached.data,
          _meta: {
            cacheHit: true,
            stale: true,
            message: "Live data temporarily unavailable, retrying",
          },
        };
      }

      if (normalizedUrl) {
        const fallback = await supabaseLiveScoreCacheService.getSnapshotBySourceUrl(normalizedUrl, {
          maxAgeMs: 5 * 60_000,
        });
        if (fallback?.payload?.match) {
          return {
            ...fallback.payload.match,
            _meta: {
              cacheHit: true,
              stale: true,
              source: "supabase-stale",
            },
          };
        }
      }

      const fallbackTeams = parseTeamsFromUrl(source?.sourceUrl);
      return {
        id: matchId,
        sourceUrl: source?.sourceUrl || null,
        sport: "cricket",
        series: source?.series || "Live Feed",
        team1: fallbackTeams.team1,
        team2: fallbackTeams.team2,
        team1Name: fallbackTeams.team1,
        team2Name: fallbackTeams.team2,
        team1Score: null,
        team2Score: null,
        team1Overs: null,
        team2Overs: null,
        score: null,
        status: "Live",
        date: null,
        startTime: "",
        venue: null,
        result: null,
        tournamentId: source?.tournamentId || "admin",
        fetchedAt: new Date().toISOString(),
        scoreboard: {
          innings: [],
          events: [],
          commentary: [],
          batters: [],
          bowlers: [],
          liveStats: {},
        },
        _meta: {
          cacheHit: false,
          stale: true,
          message: error?.message || "Live data temporarily unavailable",
        },
      };
    }
  })();

  inFlightByMatchId.set(matchId, request);
  try {
    return await request;
  } finally {
    inFlightByMatchId.delete(matchId);
  }
};

export const crexLiveMatchService = {
  getConfiguredSources() {
    return LIVE_MATCH_SOURCES.map((source) => ({
      sourceId: source.sourceId,
      tournamentId: source.tournamentId,
      id: buildMatchId(source),
      series: source.series,
      sourceUrl: normalizeSourceUrl(source.sourceUrl),
    }));
  },

  async getConfiguredLiveMatches(options = {}) {
    const tournamentId = String(options?.tournamentId || "").toLowerCase();
    const forceFresh = Boolean(options?.forceFresh);

    const sources = LIVE_MATCH_SOURCES.filter((source) =>
      tournamentId ? source.tournamentId === tournamentId : true,
    );

    const matches = await Promise.all(
      sources.map((source) => readMatchFromSource(source, { forceFresh })),
    );

    return matches;
  },

  async getLiveMatchById(matchId, options = {}) {
    const source = sourceByMatchId.get(String(matchId || "").toLowerCase());
    if (!source) {
      return null;
    }

    return readMatchFromSource(source, options);
  },

  async getLiveMatchByUrl(sourceUrl, options = {}) {
    const source = buildSourceFromUrl(sourceUrl, {
      tournamentId: options?.tournamentId,
      series: options?.series,
    });

    if (!source?.sourceUrl) {
      throw new Error("source url is required");
    }

    const match = await readMatchFromSource(source, options);
    return {
      ...match,
      sourceUrl: source.sourceUrl,
      series: match?.series || source.series,
      tournamentId: match?.tournamentId || source.tournamentId,
    };
  },

  async warmConfiguredSnapshots() {
    const sources = this.getConfiguredSources();
    const results = await Promise.allSettled(
      sources.map((source) => readMatchFromSource(source, { forceFresh: true })),
    );

    return {
      total: results.length,
      success: results.filter((row) => row.status === "fulfilled").length,
      failed: results.filter((row) => row.status === "rejected").length,
    };
  },

  async getIccLiveMatch(options = {}) {
    const [firstMatch] = await this.getConfiguredLiveMatches({
      tournamentId: "icc",
      forceFresh: options?.forceFresh,
    });
    return firstMatch || null;
  },
};
