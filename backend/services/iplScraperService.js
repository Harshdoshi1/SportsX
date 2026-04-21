import puppeteer from "puppeteer";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const POINTS_URL =
  "https://www.cricbuzz.com/cricket-series/9241/indian-premier-league-2026/points-table";
const FIXTURES_URL = "https://www.iplt20.com/matches/fixtures";
const RESULTS_URL = "https://www.iplt20.com/matches/results";
const IPL_STATS_S3_BASE =
  "https://ipl-stats-sports-mechanic.s3.ap-south-1.amazonaws.com/ipl/feeds/stats";
const IPL_PLAYER_IMAGE_BASE =
  "https://ipl-stats-sports-mechanic.s3.ap-south-1.amazonaws.com/ipl/playerimages";
const SQUADS_URL =
  "https://www.cricbuzz.com/cricket-series/9241/indian-premier-league-2026/squads";
const NEWS_URL =
  "https://www.cricbuzz.com/cricket-series/9241/indian-premier-league-2026/news";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const IPL_CACHE_DIR = path.join(__dirname, "..", "..", ".cache", "ipl");
const IPL_CACHE_FILES = {
  points: path.join(IPL_CACHE_DIR, "points.json"),
  matches: path.join(IPL_CACHE_DIR, "matches.json"),
  stats: path.join(IPL_CACHE_DIR, "stats.json"),
  squads: path.join(IPL_CACHE_DIR, "squads.json"),
  news: path.join(IPL_CACHE_DIR, "news.json"),
};

const ensureCacheDir = async () => {
  await fs.mkdir(IPL_CACHE_DIR, { recursive: true });
};

const readSnapshot = async (filePath, fallbackValue) => {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    if (parsed && Object.prototype.hasOwnProperty.call(parsed, "data")) {
      return parsed.data;
    }
    return fallbackValue;
  } catch {
    return fallbackValue;
  }
};

const writeSnapshot = async (filePath, data) => {
  try {
    await ensureCacheDir();
    await fs.writeFile(
      filePath,
      JSON.stringify({ updatedAt: new Date().toISOString(), data }, null, 2),
      "utf8",
    );
  } catch {
    // Ignore snapshot write errors to avoid blocking API responses.
  }
};

const IPL_TEAM_ALIASES = {
  CSK: ["CSK", "Chennai Super Kings"],
  MI: ["MI", "Mumbai Indians"],
  RCB: ["RCB", "Royal Challengers Bengaluru", "Royal Challengers Bangalore"],
  KKR: ["KKR", "Kolkata Knight Riders"],
  SRH: ["SRH", "Sunrisers Hyderabad"],
  RR: ["RR", "Rajasthan Royals"],
  PBKS: ["PBKS", "Punjab Kings", "Kings XI Punjab"],
  DC: ["DC", "Delhi Capitals", "Delhi Daredevils"],
  LSG: ["LSG", "Lucknow Super Giants"],
  GT: ["GT", "Gujarat Titans"],
};

const IPL_TEAM_CODES = Object.keys(IPL_TEAM_ALIASES);
const IPL_TEAM_NAMES = IPL_TEAM_CODES.flatMap((code) => IPL_TEAM_ALIASES[code] || []);

const normalizeNameKey = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const resolveIplTeamCode = (value) => {
  const raw = String(value || "").trim();
  if (!raw) {
    return null;
  }

  const upper = raw.toUpperCase();
  if (IPL_TEAM_CODES.includes(upper)) {
    return upper;
  }

  const key = normalizeNameKey(raw);
  if (!key) {
    return null;
  }

  for (const code of IPL_TEAM_CODES) {
    const aliases = IPL_TEAM_ALIASES[code] || [];
    for (const alias of aliases) {
      if (normalizeNameKey(alias) === key) {
        return code;
      }
    }
  }

  return extractIplTeamCode(raw);
};

const extractIplTeamCode = (line) => {
  const normalized = String(line || "").replace(/\s+/g, " ").trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  for (const code of IPL_TEAM_CODES) {
    const aliases = IPL_TEAM_ALIASES[code] || [];
    for (const alias of aliases) {
      const aliasNormalized = alias.toLowerCase();
      if (normalized === aliasNormalized || normalized.startsWith(`${aliasNormalized} `)) {
        return code;
      }
    }
  }

  return null;
};

const launchBrowser = async () =>
  puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

const fetchIplStatsJsonp = async (endpoint) => {
  const cb = "on" + endpoint.replace(/-/g, "").replace("284", "");
  const url = `${IPL_STATS_S3_BASE}/${endpoint}.js?callback=${cb}&_=${Date.now()}`;
  const res = await fetch(url, {
    headers: { "Referer": "https://www.iplt20.com/" },
  });
  const text = await res.text();
  const match = text.match(/\((\{[\s\S]*\})\)/);
  if (!match) return null;
  return JSON.parse(match[1]);
};

const configurePage = async (page) => {
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  );
  await page.setExtraHTTPHeaders({
    "accept-language": "en-US,en;q=0.9",
    "upgrade-insecure-requests": "1",
  });
  await page.setViewport({ width: 1366, height: 768 });
};

const parseIntSafe = (value) => {
  const parsed = Number.parseInt(String(value || "").replace(/[^0-9-]/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const cleanTeamName = (value) =>
  String(value || "")
    .replace(/^\d+\.?\s*/, "")
    .replace(/\((Q|E|q|e)\)/g, "")
    .replace(/\s+/g, " ")
    .trim();

const parseTeams = (title) => {
  const normalized = String(title || "").replace(/\s+/g, " ").trim();
  const splitByVs = normalized.split(/\s+vs\s+/i);

  if (splitByVs.length >= 2) {
    return {
      team1: splitByVs[0].trim(),
      team2: splitByVs[1].trim(),
    };
  }

  return {
    team1: null,
    team2: null,
  };
};

const extractPointsTable = async (page) =>
  page.evaluate(() => {
    const normalizeHeader = (value) =>
      String(value || "")
        .toLowerCase()
        .replace(/[^a-z]/g, "");

    const getHeaderIndexes = (headers) => {
      const indexOfAny = (keys) => headers.findIndex((header) => keys.includes(header));

      return {
        team: indexOfAny(["team", "teams"]),
        played: indexOfAny(["p", "played"]),
        win: indexOfAny(["w", "win", "wins"]),
        loss: indexOfAny(["l", "loss", "losses"]),
        nr: indexOfAny(["nr"]),
        points: indexOfAny(["pts", "point", "points"]),
        nrr: indexOfAny(["nrr", "netrunrate"]),
      };
    };

    const rows = [];
    const tables = Array.from(document.querySelectorAll("table"));

    for (const table of tables) {
      const headerCells = Array.from(table.querySelectorAll("thead th"));
      if (headerCells.length === 0) {
        continue;
      }

      const headers = headerCells.map((headerCell) => normalizeHeader(headerCell.textContent));
      const indexes = getHeaderIndexes(headers);

      if (indexes.points < 0 || indexes.nrr < 0) {
        continue;
      }

      const tableRows = Array.from(table.querySelectorAll("tbody tr"));
      for (const row of tableRows) {
        const cells = Array.from(row.querySelectorAll("td"))
          .map((cell) => String(cell.textContent || "").replace(/\s+/g, " ").trim())
          .filter(Boolean);

        if (cells.length < 6) {
          continue;
        }

        rows.push({ cells, indexes });
      }

      if (rows.length > 0) {
        break;
      }
    }

    return rows;
  });

const extractPageTextLines = async (page) => {
  const text = await page.evaluate(() => document.body?.innerText || "");
  return text
    .split("\n")
    .map((line) => String(line || "").trim())
    .filter(Boolean);
};

const parsePointsFromText = (lines) => {
  const start = lines.findIndex((line) => line.toUpperCase() === "TEAMS");
  if (start < 0) {
    return [];
  }

  const rows = [];
  let idx = start + 1;

  while (idx + 7 < lines.length) {
    const rank = lines[idx];
    if (!/^\d{1,2}$/.test(rank)) {
      if (rows.length > 0) {
        break;
      }
      idx += 1;
      continue;
    }

    const team = cleanTeamName(lines[idx + 1]);
    const played = parseIntSafe(lines[idx + 2]);
    const win = parseIntSafe(lines[idx + 3]);
    const loss = parseIntSafe(lines[idx + 4]);
    const nr = parseIntSafe(lines[idx + 5]);
    const points = parseIntSafe(lines[idx + 6]);
    const nrr = String(lines[idx + 7] || "").trim() || null;

    if (!team || played === null || win === null || loss === null || points === null || !nrr) {
      idx += 1;
      continue;
    }

    rows.push({
      team,
      played,
      win,
      loss,
      nr,
      points,
      nrr,
    });

    idx += 8;
  }

  return rows;
};

const extractMatches = async (page) =>
  page.evaluate(() => {
    const clean = (value) => String(value || "").replace(/\s+/g, " ").trim();

    const anchors = Array.from(document.querySelectorAll('a[href*="/live-cricket-scores/"]'));

    const rawMatches = anchors
      .map((anchor) => {
        const title = clean(anchor.textContent);
        if (!title) {
          return null;
        }

        const card =
          anchor.closest(".cb-mtch-lst") ||
          anchor.closest("article") ||
          anchor.closest("li") ||
          anchor.parentElement;

        if (!card) {
          return null;
        }

        const cardText = clean(card.textContent);
        const lines = cardText
          .split("\n")
          .map((line) => clean(line))
          .filter(Boolean);

        const dateLine =
          lines.find((line) => /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i.test(line)) ||
          lines.find((line) => /\b\d{1,2}:\d{2}\b/.test(line)) ||
          null;

        const venueLine =
          lines.find((line) => /stadium|ground|,\s*[a-z]/i.test(line)) ||
          null;

        const statusLine =
          lines.find((line) => /live|stumps|won|abandoned|result|starts|upcoming|today|tomorrow/i.test(line)) ||
          null;

        return {
          title,
          date: dateLine,
          venue: venueLine,
          status: statusLine,
        };
      })
      .filter(Boolean);

    const unique = [];
    const seen = new Set();

    for (const match of rawMatches) {
      const key = `${match.title}|${match.date || ""}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      unique.push(match);
    }

    return unique;
  });

const extractIplt20Matches = async (page, status) =>
  page.evaluate((matchStatus) => {
    const clean = (value) => String(value || "").replace(/\s+/g, " ").trim();

    const cards = Array.from(document.querySelectorAll("a.vn-matchBtn"))
      .map((anchor) => {
        const card = anchor.closest("li") || anchor.parentElement;
        if (!card) {
          return null;
        }

        const href = clean(anchor.getAttribute("href"));
        const idFromHref = href.match(/\/match\/\d+\/(\d+)/)?.[1] || href.match(/(\d+)$/)?.[1] || null;

        const matchNo = clean(card.querySelector(".vn-matchOrder")?.textContent || "");
        const venue = clean(card.querySelector(".vn-venueDet p")?.textContent || "");
        let date = clean(card.querySelector(".vn-matchDate")?.textContent || "");
        let startTime = clean(card.querySelector(".vn-matchTime")?.textContent || "");
        const combinedDateTime = clean(card.querySelector(".vn-matchDateTime")?.textContent || "");

        if ((!date || !startTime) && combinedDateTime) {
          const timeMatch = combinedDateTime.match(/\d{1,2}:\d{2}\s*(?:am|pm)\s*IST/i);
          if (!startTime && timeMatch?.[0]) {
            startTime = clean(timeMatch[0]);
          }
          if (!date) {
            date = clean(
              combinedDateTime
                .replace(timeMatch?.[0] || "", "")
                .replace(/\s+,/g, ",")
                .replace(/[\s,]+$/, ""),
            );
          }
        }
        const resultText = clean(card.querySelector(".vn-ticketTitle")?.textContent || "");

        const teams = Array.from(card.querySelectorAll(".vn-shedTeam"))
          .slice(0, 2)
          .map((teamEl) => {
            const name = clean(teamEl.querySelector(".vn-teamName h3")?.textContent || "");
            const code = clean(teamEl.querySelector(".vn-teamCode h3")?.textContent || "");
            const text = clean(teamEl.textContent || "");
            const score = clean(text.match(/\d{1,3}\/\d{1,2}\s*\(\d+(?:\.\d+)?\s*OV\s*\)/i)?.[0] || "");

            return {
              name,
              code,
              score: score || null,
            };
          })
          .filter((team) => team.name || team.code);

        if (teams.length < 2) {
          return null;
        }

        return {
          id: idFromHref,
          href,
          matchNo,
          venue,
          date,
          startTime: startTime || null,
          status: matchStatus,
          result: resultText || null,
          team1Name: teams[0]?.name || null,
          team1Code: teams[0]?.code || null,
          team1Score: teams[0]?.score || null,
          team2Name: teams[1]?.name || null,
          team2Code: teams[1]?.code || null,
          team2Score: teams[1]?.score || null,
        };
      })
      .filter(Boolean);

    const unique = [];
    const seen = new Set();
    for (const match of cards) {
      const key = String(match.id || `${match.matchNo}-${match.team1Code}-${match.team2Code}`);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      unique.push(match);
    }

    return unique;
  }, status);

const normalizeIplt20Matches = (rows) => {
  const mapped = (rows || [])
    .map((row) => {
      const team1 = resolveIplTeamCode(row?.team1Code || row?.team1Name) || row?.team1Code || row?.team1Name;
      const team2 = resolveIplTeamCode(row?.team2Code || row?.team2Name) || row?.team2Code || row?.team2Name;

      if (!team1 || !team2) {
        return null;
      }

      const id = String(row?.id || "").trim() || `${String(row?.matchNo || "").trim()}-${team1}-${team2}`;

      return {
        id,
        matchNo: String(row?.matchNo || "").trim() || null,
        team1,
        team2,
        team1Name: row?.team1Name || null,
        team2Name: row?.team2Name || null,
        team1Score: row?.team1Score || null,
        team2Score: row?.team2Score || null,
        date: row?.date || null,
        startTime: row?.startTime || null,
        venue: row?.venue || null,
        status: row?.status || "Upcoming",
        result: row?.result || null,
      };
    })
    .filter(Boolean);

  const unique = [];
  const seen = new Set();
  for (const match of mapped) {
    const key = String(match.id || `${match.team1}-${match.team2}-${match.date || ""}`);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(match);
  }

  return unique;
};

const parseMatchStatus = (text) => {
  const value = String(text || "").toLowerCase();
  if (!value) {
    return "Upcoming";
  }
  if (/won|abandoned|no result|tied|match over|stumps/.test(value)) {
    return "Completed";
  }
  if (/live|need|required|trail|lead|innings break|day /.test(value)) {
    return "Live";
  }
  return "Upcoming";
};

const parseMatchesFromText = (lines) => {
  const dateRegex = /^(SUN|MON|TUE|WED|THU|FRI|SAT),\s+[A-Z]{3}\s+\d{1,2}\s+\d{4}$/i;
  const infoRegex = /•/;
  const matchInfoRegex = /\b(match|qualifier|eliminator|final|playoff)\b/i;
  const scoreRegex = /^\d{1,3}(?:-\d{1,2})?\s*\(\d+(?:\.\d+)?\)$/;

  const seriesNavIndex = lines.findIndex((line) => line.toLowerCase() === "venues");
  const firstDateIndex = lines.findIndex((line) => dateRegex.test(line));
  const startIndex = firstDateIndex >= 0 ? Math.max(firstDateIndex, seriesNavIndex) : 0;

  const matches = [];
  let currentDate = null;

  for (let i = startIndex; i < lines.length; i += 1) {
    const line = lines[i];

    if (dateRegex.test(line)) {
      currentDate = line;
      continue;
    }

    if (!infoRegex.test(line) || !matchInfoRegex.test(line)) {
      continue;
    }

    if (!currentDate) {
      continue;
    }

    const venue = line.split("•")[1]?.trim() || null;
    if (!venue) {
      continue;
    }

    let nextBoundary = lines.length;
    for (let j = i + 1; j < lines.length; j += 1) {
      const boundaryLine = lines[j];
      if (dateRegex.test(boundaryLine)) {
        nextBoundary = j;
        break;
      }
      if (infoRegex.test(boundaryLine) && matchInfoRegex.test(boundaryLine)) {
        nextBoundary = j;
        break;
      }
    }

    const blockLines = lines.slice(i + 1, nextBoundary);

    const teamsInOrder = [];
    const scoresInOrder = [];
    const seenTeams = new Set();
    let statusLine = null;
    let startTime = null;

    for (const candidate of blockLines) {
      const teamCode = extractIplTeamCode(candidate);
      if (!teamCode || seenTeams.has(teamCode)) {
        continue;
      }

      seenTeams.add(teamCode);
      teamsInOrder.push(teamCode);
      if (teamsInOrder.length >= 2) {
        break;
      }
    }

    for (const candidate of blockLines) {
      if (scoreRegex.test(candidate)) {
        scoresInOrder.push(candidate);
      }
    }

    for (const candidate of blockLines) {
      if (/won by|no result|abandoned|tied|match tied|super over|cancelled|live|stumps/i.test(candidate)) {
        statusLine = candidate;
        break;
      }
    }

    for (const candidate of blockLines) {
      if (/^\d{1,2}:\d{2}\s*(AM|PM)\b/i.test(candidate)) {
        startTime = candidate;
        break;
      }
    }

    if (teamsInOrder.length < 2) {
      continue;
    }

    const [team1, team2] = teamsInOrder;

    matches.push({
      team1,
      team2,
      team1Score: scoresInOrder[0] || null,
      team2Score: scoresInOrder[1] || null,
      date: currentDate,
      startTime,
      venue,
      status: parseMatchStatus(statusLine || "Upcoming"),
      result: statusLine || null,
    });

    i = nextBoundary - 1;
  }

  const unique = [];
  const seen = new Set();
  for (const match of matches) {
    const key = `${match.team1}-${match.team2}-${match.date || ""}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(match);
  }

  return unique;
};

const parseGoogleStatsFromText = (lines) => {
  const result = {
    categories: { batting: [], bowling: [] },
    leaders: [],
    battingLeaders: [],
    bowlingLeaders: [],
    mostRuns: [],
    mostWickets: [],
    mostHundreds: [],
    mostFifties: [],
    highestScores: [],
    bestBowling: [],
    bestEconomy: [],
    mostSixes: [],
    mostFours: [],
  };

  // Look for category headers in text
  let currentSection = null;
  const sectionData = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]?.toLowerCase() || "";

    // Detect section headers
    if (line.includes("most runs") || line.includes("orange cap")) {
      currentSection = "mostRuns";
      result.categories.batting.push("Most Runs");
      sectionData[currentSection] = [];
    } else if (line.includes("most wickets") || line.includes("purple cap")) {
      currentSection = "mostWickets";
      result.categories.bowling.push("Most Wickets");
      sectionData[currentSection] = [];
    } else if (line.includes("most hundreds") || line.includes("100s") || line.includes("hundreds")) {
      currentSection = "mostHundreds";
      result.categories.batting.push("Most Hundreds");
      sectionData[currentSection] = [];
    } else if (line.includes("most fifties") || line.includes("50s") || line.includes("fifties")) {
      currentSection = "mostFifties";
      result.categories.batting.push("Most Fifties");
      sectionData[currentSection] = [];
    } else if (line.includes("highest score")) {
      currentSection = "highestScores";
      result.categories.batting.push("Highest Scores");
      sectionData[currentSection] = [];
    } else if (line.includes("best bowling")) {
      currentSection = "bestBowling";
      result.categories.bowling.push("Best Bowling");
      sectionData[currentSection] = [];
    } else if (line.includes("best economy")) {
      currentSection = "bestEconomy";
      result.categories.bowling.push("Best Economy");
      sectionData[currentSection] = [];
    } else if (line.includes("most sixes")) {
      currentSection = "mostSixes";
      result.categories.batting.push("Most Sixes");
      sectionData[currentSection] = [];
    } else if (line.includes("most fours")) {
      currentSection = "mostFours";
      result.categories.batting.push("Most Fours");
      sectionData[currentSection] = [];
    }

    // If we're in a section and find player-like lines
    if (currentSection && line && !line.includes("most ") && !line.includes("best ")) {
      // Look for lines that might contain player names and values
      // Pattern: Player Name Team Value
      const parts = lines[i].split(/\t+|\s{2,}/).filter(Boolean);
      if (parts.length >= 3) {
        const possibleValue = parts[parts.length - 1];
        const possiblePlayer = parts[0];
        const possibleTeam = parts[1];

        // Check if last part looks like a number/stat
        if (/^\d+/.test(possibleValue) || /^\d+\.\d+/.test(possibleValue) || /^\d+\/\d+/.test(possibleValue)) {
          if (possiblePlayer.length > 2 && !possiblePlayer.match(/^\d+$/)) {
            sectionData[currentSection].push({
              player: possiblePlayer,
              teamShort: possibleTeam,
              teamName: possibleTeam,
              value: possibleValue,
              rank: sectionData[currentSection].length + 1,
            });

            if (sectionData[currentSection].length >= 5) {
              currentSection = null; // Move to next section
            }
          }
        }
      }
    }
  }

  // Transfer section data to result
  Object.keys(sectionData).forEach((key) => {
    if (sectionData[key].length > 0) {
      result[key] = sectionData[key];

      // Populate main leader arrays
      if (key === "mostRuns") {
        result.leaders = sectionData[key].map(p => ({
          player: p.player,
          image: null,
          teamShort: p.teamShort,
          teamName: p.teamName,
          matches: null,
          innings: null,
          runs: parseInt(p.value) || null,
          average: "-",
          strikeRate: "-",
          fours: null,
          sixes: null,
        }));
        result.battingLeaders = result.leaders;
      } else if (key === "mostWickets") {
        result.bowlingLeaders = sectionData[key].map(p => ({
          player: p.player,
          image: null,
          teamShort: p.teamShort,
          teamName: p.teamName,
          matches: null,
          innings: null,
          overs: "-",
          runs: null,
          wickets: parseInt(p.value) || null,
          bbi: "-",
          average: "-",
          economy: "-",
          strikeRate: "-",
        }));
      }
    }
  });

  return result;
};

const parseStatsFromText = (lines) => {
  const start = lines.findIndex((line) => line.toLowerCase() === "batting");
  const tableHeaderIndex = lines.findIndex((line) => /player\s+matches\s+inns\s+runs\s+avg\s+sr/i.test(line));
  const bowlingHeaderIndex = lines.findIndex((line) => /player\s+matches\s+inns\s+overs\s+runs\s+wkts\s+bbi\s+avg\s+econ\s+sr/i.test(line));

  if (start < 0 || tableHeaderIndex < 0) {
    return {
      categories: {
        batting: [],
        bowling: [],
      },
      leaders: [],
      battingLeaders: [],
      bowlingLeaders: [],
    };
  }

  const battingCategories = [];
  const bowlingCategories = [];
  let mode = "batting";

  for (let i = start + 1; i < tableHeaderIndex; i += 1) {
    const line = lines[i];
    if (!line) {
      continue;
    }
    if (line.toLowerCase() === "bowling") {
      mode = "bowling";
      continue;
    }
    if (/^home|matches|series|videos|news$/i.test(line)) {
      break;
    }
    if (/most|best|highest/i.test(line)) {
      if (mode === "batting") {
        battingCategories.push(line);
      } else {
        bowlingCategories.push(line);
      }
    }
  }

  const battingLeaders = [];
  const battingEnd = bowlingHeaderIndex > tableHeaderIndex ? bowlingHeaderIndex : lines.length;
  for (let i = tableHeaderIndex + 1; i < battingEnd; i += 1) {
    const line = lines[i];
    if (!line || line === ";" || /^home$/i.test(line)) {
      break;
    }

    const cols = line.split(/\t+/).map((c) => c.trim()).filter(Boolean);
    if (cols.length < 8) {
      continue;
    }

    battingLeaders.push({
      player: cols[0],
      matches: parseIntSafe(cols[1]),
      innings: parseIntSafe(cols[2]),
      runs: parseIntSafe(cols[3]),
      average: cols[4],
      strikeRate: cols[5],
      fours: parseIntSafe(cols[6]),
      sixes: parseIntSafe(cols[7]),
    });
  }

  const bowlingLeaders = [];
  if (bowlingHeaderIndex >= 0) {
    for (let i = bowlingHeaderIndex + 1; i < lines.length; i += 1) {
      const line = lines[i];
      if (!line || line === ";" || /^home$/i.test(line)) {
        break;
      }

      const cols = line.split(/\t+/).map((c) => c.trim()).filter(Boolean);
      if (cols.length < 10) {
        continue;
      }

      bowlingLeaders.push({
        player: cols[0],
        matches: parseIntSafe(cols[1]),
        innings: parseIntSafe(cols[2]),
        overs: cols[3],
        runs: parseIntSafe(cols[4]),
        wickets: parseIntSafe(cols[5]),
        bbi: cols[6],
        average: cols[7],
        economy: cols[8],
        strikeRate: cols[9],
      });
    }
  }

  return {
    categories: {
      batting: battingCategories,
      bowling: bowlingCategories,
    },
    leaders: battingLeaders,
    battingLeaders,
    bowlingLeaders,
  };
};

const parseSquadsFromText = (lines) => {
  const squadsHeaderIndex = lines.findIndex((line) => /squads for indian premier league/i.test(line));
  if (squadsHeaderIndex < 0) {
    return {
      teams: [],
      featuredTeam: null,
      players: [],
    };
  }

  const roleHeaders = new Set(["BATTERS", "ALL ROUNDERS", "WICKET KEEPERS", "BOWLERS"]);
  const validRoleRegex = /^(Batsman|Bowler|WK-Batsman|Batting Allrounder|Bowling Allrounder|Allrounder)$/i;
  const teams = [];

  let idx = squadsHeaderIndex + 1;
  while (idx < lines.length) {
    const line = lines[idx];
    if (roleHeaders.has(line)) {
      break;
    }

    if (line !== "T20" && IPL_TEAM_NAMES.includes(line)) {
      teams.push(line);
    }

    idx += 1;
  }

  const players = [];
  let currentRoleGroup = null;
  for (; idx < lines.length; idx += 1) {
    const line = lines[idx];

    if (/^home$/i.test(line)) {
      break;
    }

    if (roleHeaders.has(line)) {
      currentRoleGroup = line;
      continue;
    }

    if (!currentRoleGroup || !line) {
      continue;
    }

    const role = lines[idx + 1];
    if (!role || roleHeaders.has(role) || /^home$/i.test(role)) {
      continue;
    }

    if (!validRoleRegex.test(role)) {
      continue;
    }

    if (line === line.toUpperCase() && line.length > 20) {
      continue;
    }

    players.push({
      name: line,
      roleGroup: currentRoleGroup,
      role,
    });

    idx += 1;
  }

  return {
    teams,
    featuredTeam: teams[0] || null,
    players,
  };
};

const parseNewsFromText = (lines) => {
  const dateRegex = /^(Sun|Mon|Tue|Wed|Thu|Fri|Sat),\s+[A-Za-z]{3}\s+\d{1,2}\s+\d{4}$/;
  const start = lines.findIndex((line) => line.toUpperCase() === "DAILY BRIEFING");
  const scanStart = start >= 0 ? start : 0;

  const items = [];
  const seenTitles = new Set();

  for (let i = scanStart; i < lines.length; i += 1) {
    const line = lines[i];
    if (!dateRegex.test(line)) {
      continue;
    }

    const title = lines[i - 2] || null;
    const summary = lines[i - 1] || null;
    const tag = lines[i + 1] || null;

    if (!title || /^home|matches|series|videos|news$/i.test(title) || title === "DAILY BRIEFING") {
      continue;
    }

    if (seenTitles.has(title)) {
      continue;
    }
    seenTitles.add(title);

    items.push({
      title,
      summary: summary && summary !== title ? summary : null,
      publishedAt: line,
      tag: tag && /ipl/i.test(tag) ? tag : "IPL 2026",
    });
  }

  return items;
};

export const iplScraperService = {
  async scrapePointsTable() {
    let browser;

    try {
      browser = await launchBrowser();
      const page = await browser.newPage();
      await configurePage(page);
      await page.goto(POINTS_URL, { waitUntil: "networkidle2", timeout: 60000 });

      const rawRows = await extractPointsTable(page);
      const tableRows = rawRows
        .map((row) => {
          const { cells, indexes } = row;
          const team = cleanTeamName(cells[indexes.team >= 0 ? indexes.team : 0]);
          if (!team) {
            return null;
          }

          return {
            team,
            played: parseIntSafe(cells[indexes.played]),
            win: parseIntSafe(cells[indexes.win]),
            loss: parseIntSafe(cells[indexes.loss]),
            nr: parseIntSafe(cells[indexes.nr]),
            points: parseIntSafe(cells[indexes.points]),
            nrr: String(cells[indexes.nrr] || "").trim() || null,
          };
        })
        .filter(Boolean);

      if (tableRows.length > 0) {
        await writeSnapshot(IPL_CACHE_FILES.points, tableRows);
        return tableRows;
      }

      const textLines = await extractPageTextLines(page);
      const parsed = parsePointsFromText(textLines);
      if (parsed.length > 0) {
        await writeSnapshot(IPL_CACHE_FILES.points, parsed);
        return parsed;
      }

      return await readSnapshot(IPL_CACHE_FILES.points, []);
    } catch {
      return await readSnapshot(IPL_CACHE_FILES.points, []);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  },

  async scrapeMatches() {
    let browser;

    try {
      browser = await launchBrowser();
      const fixturesPage = await browser.newPage();
      await configurePage(fixturesPage);
      await fixturesPage.goto(FIXTURES_URL, { waitUntil: "networkidle2", timeout: 60000 });
      const upcoming = await extractIplt20Matches(fixturesPage, "Upcoming");
      await fixturesPage.close();

      const resultsPage = await browser.newPage();
      await configurePage(resultsPage);
      await resultsPage.goto(RESULTS_URL, { waitUntil: "networkidle2", timeout: 60000 });
      const completed = await extractIplt20Matches(resultsPage, "Completed");
      await resultsPage.close();

      const normalized = normalizeIplt20Matches([...upcoming, ...completed]);
      if (normalized.length > 0) {
        await writeSnapshot(IPL_CACHE_FILES.matches, normalized);
        return normalized;
      }

      return await readSnapshot(IPL_CACHE_FILES.matches, []);
    } catch {
      return await readSnapshot(IPL_CACHE_FILES.matches, []);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  },

  async scrapeStats() {
    try {
      const result = {
        categories: {
          batting: ["Most Runs"],
          bowling: ["Most Wickets"],
        },
        leaders: [],
        battingLeaders: [],
        bowlingLeaders: [],
        mostRuns: [],
        mostWickets: [],
        mostHundreds: [],
        mostFifties: [],
        highestScores: [],
        bestBowling: [],
        bestEconomy: [],
        mostSixes: [],
        mostFours: [],
      };

      // Fetch batting stats from iplt20.com S3 JSONP API
      try {
        const battingRes = await fetchIplStatsJsonp("284-toprunsscorers");
        const battingData = battingRes?.toprunsscorers || [];

        if (battingData.length > 0) {
          result.battingLeaders = battingData.slice(0, 10).map((p) => ({
            player: p.StrikerName,
            image: `${IPL_PLAYER_IMAGE_BASE}/${encodeURIComponent(p.StrikerName)}.png`,
            teamShort: p.TeamCode,
            teamName: p.TeamName,
            matches: parseIntSafe(p.Matches),
            innings: parseIntSafe(p.Innings),
            runs: parseIntSafe(p.TotalRuns),
            average: p.BattingAverage || "-",
            strikeRate: p.StrikeRate || "-",
            fours: parseIntSafe(p.Fours),
            sixes: parseIntSafe(p.Sixes),
          }));
          result.leaders = result.battingLeaders;

          result.mostRuns = battingData.slice(0, 10).map((p, idx) => ({
            rank: idx + 1,
            player: p.StrikerName,
            image: `${IPL_PLAYER_IMAGE_BASE}/${encodeURIComponent(p.StrikerName)}.png`,
            teamShort: p.TeamCode,
            teamName: p.TeamName,
            value: String(p.TotalRuns),
          }));

          result.mostHundreds = battingData
            .filter((p) => parseIntSafe(p.Centuries) > 0)
            .sort((a, b) => parseIntSafe(b.Centuries) - parseIntSafe(a.Centuries))
            .slice(0, 10)
            .map((p, idx) => ({
              rank: idx + 1,
              player: p.StrikerName,
              image: `${IPL_PLAYER_IMAGE_BASE}/${encodeURIComponent(p.StrikerName)}.png`,
              teamShort: p.TeamCode,
              teamName: p.TeamName,
              value: String(p.Centuries),
            }));

          result.mostFifties = battingData
            .filter((p) => parseIntSafe(p.FiftyPlusRuns) > 0)
            .sort((a, b) => parseIntSafe(b.FiftyPlusRuns) - parseIntSafe(a.FiftyPlusRuns))
            .slice(0, 10)
            .map((p, idx) => ({
              rank: idx + 1,
              player: p.StrikerName,
              image: `${IPL_PLAYER_IMAGE_BASE}/${encodeURIComponent(p.StrikerName)}.png`,
              teamShort: p.TeamCode,
              teamName: p.TeamName,
              value: String(p.FiftyPlusRuns),
            }));

          result.mostSixes = battingData
            .filter((p) => parseIntSafe(p.Sixes) > 0)
            .sort((a, b) => parseIntSafe(b.Sixes) - parseIntSafe(a.Sixes))
            .slice(0, 10)
            .map((p, idx) => ({
              rank: idx + 1,
              player: p.StrikerName,
              image: `${IPL_PLAYER_IMAGE_BASE}/${encodeURIComponent(p.StrikerName)}.png`,
              teamShort: p.TeamCode,
              teamName: p.TeamName,
              value: String(p.Sixes),
            }));

          result.mostFours = battingData
            .filter((p) => parseIntSafe(p.Fours) > 0)
            .sort((a, b) => parseIntSafe(b.Fours) - parseIntSafe(a.Fours))
            .slice(0, 10)
            .map((p, idx) => ({
              rank: idx + 1,
              player: p.StrikerName,
              image: `${IPL_PLAYER_IMAGE_BASE}/${encodeURIComponent(p.StrikerName)}.png`,
              teamShort: p.TeamCode,
              teamName: p.TeamName,
              value: String(p.Fours),
            }));
        }
      } catch (battingError) {
        console.error("Batting stats fetch failed:", battingError);
      }

      // Fetch bowling stats from iplt20.com S3 JSONP API
      try {
        const bowlingRes = await fetchIplStatsJsonp("284-mostwickets");
        const bowlingData = bowlingRes?.mostwickets || [];

        if (bowlingData.length > 0) {
          result.bowlingLeaders = bowlingData.slice(0, 10).map((p) => ({
            player: p.BowlerName,
            image: `${IPL_PLAYER_IMAGE_BASE}/${encodeURIComponent(p.BowlerName)}.png`,
            teamShort: p.TeamCode,
            teamName: p.TeamName,
            matches: parseIntSafe(p.Matches),
            innings: parseIntSafe(p.Innings),
            overs: p.OversBowled || "-",
            runs: parseIntSafe(p.TotalRunsConceded),
            wickets: parseIntSafe(p.Wickets),
            bbi: p.BBIW || "-",
            average: p.BowlingAverage || "-",
            economy: p.EconomyRate || "-",
            strikeRate: p.BowlingSR || p.StrikeRate || "-",
          }));

          result.mostWickets = bowlingData.slice(0, 10).map((p, idx) => ({
            rank: idx + 1,
            player: p.BowlerName,
            image: `${IPL_PLAYER_IMAGE_BASE}/${encodeURIComponent(p.BowlerName)}.png`,
            teamShort: p.TeamCode,
            teamName: p.TeamName,
            value: String(p.Wickets),
          }));
        }
      } catch (bowlingError) {
        console.error("Bowling stats fetch failed:", bowlingError);
      }

      // Fetch additional category leaderboards from iplt20.com S3 JSONP APIs
      try {
        const fiftiesRes = await fetchIplStatsJsonp("284-mostfifties");
        const fiftiesData = fiftiesRes?.mostfifties || [];
        if (fiftiesData.length > 0 && result.mostFifties.length === 0) {
          result.mostFifties = fiftiesData.slice(0, 10).map((p, idx) => ({
            rank: idx + 1,
            player: p.StrikerName,
            image: `${IPL_PLAYER_IMAGE_BASE}/${encodeURIComponent(p.StrikerName)}.png`,
            teamShort: p.TeamCode,
            teamName: p.TeamName,
            value: String(p.FiftyPlusRuns),
          }));
        }
      } catch (e) {
        console.error("Most fifties fetch failed:", e);
      }

      try {
        const sixesRes = await fetchIplStatsJsonp("284-mostsixes");
        const sixesData = sixesRes?.mostsixes || [];
        if (sixesData.length > 0 && result.mostSixes.length === 0) {
          result.mostSixes = sixesData.slice(0, 10).map((p, idx) => ({
            rank: idx + 1,
            player: p.StrikerName,
            image: `${IPL_PLAYER_IMAGE_BASE}/${encodeURIComponent(p.StrikerName)}.png`,
            teamShort: p.TeamCode,
            teamName: p.TeamName,
            value: String(p.Sixes),
          }));
        }
      } catch (e) {
        console.error("Most sixes fetch failed:", e);
      }

      try {
        const foursRes = await fetchIplStatsJsonp("284-mostfours");
        const foursData = foursRes?.mostfours || [];
        if (foursData.length > 0 && result.mostFours.length === 0) {
          result.mostFours = foursData.slice(0, 10).map((p, idx) => ({
            rank: idx + 1,
            player: p.StrikerName,
            image: `${IPL_PLAYER_IMAGE_BASE}/${encodeURIComponent(p.StrikerName)}.png`,
            teamShort: p.TeamCode,
            teamName: p.TeamName,
            value: String(p.Fours),
          }));
        }
      } catch (e) {
        console.error("Most fours fetch failed:", e);
      }

      // Cache and return if we have data
      if (result.battingLeaders.length > 0 || result.bowlingLeaders.length > 0) {
        await writeSnapshot(IPL_CACHE_FILES.stats, result);
        return result;
      }

      // Fallback to cached data
      return await readSnapshot(IPL_CACHE_FILES.stats, {
        categories: { batting: [], bowling: [] },
        leaders: [],
        battingLeaders: [],
        bowlingLeaders: [],
        mostRuns: [],
        mostWickets: [],
      });
    } catch (error) {
      console.error("Stats scraping failed:", error);
      return await readSnapshot(IPL_CACHE_FILES.stats, {
        categories: { batting: [], bowling: [] },
        leaders: [],
        battingLeaders: [],
        bowlingLeaders: [],
        mostRuns: [],
        mostWickets: [],
      });
    }
  },

  async scrapeSquads() {
    let browser;

    try {
      browser = await launchBrowser();
      const page = await browser.newPage();
      await configurePage(page);
      await page.goto(SQUADS_URL, { waitUntil: "networkidle2", timeout: 60000 });

      const textLines = await extractPageTextLines(page);
      const parsed = parseSquadsFromText(textLines);
      if ((parsed?.players || []).length > 0) {
        await writeSnapshot(IPL_CACHE_FILES.squads, parsed);
        return parsed;
      }

      return await readSnapshot(IPL_CACHE_FILES.squads, {
        teams: [],
        featuredTeam: null,
        players: [],
      });
    } catch {
      return await readSnapshot(IPL_CACHE_FILES.squads, {
        teams: [],
        featuredTeam: null,
        players: [],
      });
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  },

  async scrapeNews() {
    let browser;

    try {
      browser = await launchBrowser();
      const page = await browser.newPage();
      await configurePage(page);
      await page.goto(NEWS_URL, { waitUntil: "networkidle2", timeout: 60000 });

      const textLines = await extractPageTextLines(page);
      const parsed = parseNewsFromText(textLines);
      if (parsed.length > 0) {
        await writeSnapshot(IPL_CACHE_FILES.news, parsed);
        return parsed;
      }

      return await readSnapshot(IPL_CACHE_FILES.news, []);
    } catch {
      return await readSnapshot(IPL_CACHE_FILES.news, []);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  },
};
