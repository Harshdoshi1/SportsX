import puppeteer from "puppeteer";

const POINTS_URL =
  "https://www.cricbuzz.com/cricket-series/9241/indian-premier-league-2026/points-table";
const MATCHES_URL =
  "https://www.cricbuzz.com/cricket-series/9241/indian-premier-league-2026/matches";
const STATS_URL =
  "https://www.cricbuzz.com/cricket-series/9241/indian-premier-league-2026/stats";
const SQUADS_URL =
  "https://www.cricbuzz.com/cricket-series/9241/indian-premier-league-2026/squads";
const NEWS_URL =
  "https://www.cricbuzz.com/cricket-series/9241/indian-premier-league-2026/news";

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

const parseStatsFromText = (lines) => {
  const start = lines.findIndex((line) => line.toLowerCase() === "batting");
  const tableHeaderIndex = lines.findIndex((line) => /player\s+matches\s+inns\s+runs\s+avg\s+sr/i.test(line));

  if (start < 0 || tableHeaderIndex < 0) {
    return {
      categories: {
        batting: [],
        bowling: [],
      },
      leaders: [],
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

  const leaders = [];
  for (let i = tableHeaderIndex + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line || line === ";" || /^home$/i.test(line)) {
      break;
    }

    const cols = line.split(/\t+/).map((c) => c.trim()).filter(Boolean);
    if (cols.length < 8) {
      continue;
    }

    leaders.push({
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

  return {
    categories: {
      batting: battingCategories,
      bowling: bowlingCategories,
    },
    leaders,
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
        return tableRows;
      }

      const textLines = await extractPageTextLines(page);
      return parsePointsFromText(textLines);
    } catch {
      return [];
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
      const page = await browser.newPage();
      await configurePage(page);
      await page.goto(MATCHES_URL, { waitUntil: "networkidle2", timeout: 60000 });

      const textLines = await extractPageTextLines(page);
      return parseMatchesFromText(textLines);
    } catch {
      return [];
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  },

  async scrapeStats() {
    let browser;

    try {
      browser = await launchBrowser();
      const page = await browser.newPage();
      await configurePage(page);
      await page.goto(STATS_URL, { waitUntil: "networkidle2", timeout: 60000 });

      const textLines = await extractPageTextLines(page);
      return parseStatsFromText(textLines);
    } catch {
      return {
        categories: {
          batting: [],
          bowling: [],
        },
        leaders: [],
      };
    } finally {
      if (browser) {
        await browser.close();
      }
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
      return parseSquadsFromText(textLines);
    } catch {
      return {
        teams: [],
        featuredTeam: null,
        players: [],
      };
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
      return parseNewsFromText(textLines);
    } catch {
      return [];
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  },
};
