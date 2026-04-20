import puppeteer from "puppeteer";

const POINTS_URL =
  "https://www.cricbuzz.com/cricket-series/9241/indian-premier-league-2026/points-table";
const MATCHES_URL =
  "https://www.cricbuzz.com/cricket-series/9241/indian-premier-league-2026/matches";

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
      date: currentDate,
      venue,
      status: parseMatchStatus(statusLine || "Upcoming"),
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
};
