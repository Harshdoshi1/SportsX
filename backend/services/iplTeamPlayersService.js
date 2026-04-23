import puppeteer from "puppeteer";

const TEAM_CATALOG = [
  { short: "CSK", name: "Chennai Super Kings", slug: "chennai-super-kings" },
  { short: "DC", name: "Delhi Capitals", slug: "delhi-capitals" },
  { short: "GT", name: "Gujarat Titans", slug: "gujarat-titans" },
  { short: "KKR", name: "Kolkata Knight Riders", slug: "kolkata-knight-riders" },
  { short: "LSG", name: "Lucknow Super Giants", slug: "lucknow-super-giants" },
  { short: "MI", name: "Mumbai Indians", slug: "mumbai-indians" },
  { short: "PBKS", name: "Punjab Kings", slug: "punjab-kings" },
  { short: "RR", name: "Rajasthan Royals", slug: "rajasthan-royals" },
  { short: "RCB", name: "Royal Challengers Bengaluru", slug: "royal-challengers-bengaluru" },
  { short: "SRH", name: "Sunrisers Hyderabad", slug: "sunrisers-hyderabad" },
];

const TEAM_SLUGS = {
  csk: "chennai-super-kings",
  "chennai super kings": "chennai-super-kings",
  dc: "delhi-capitals",
  "delhi capitals": "delhi-capitals",
  gt: "gujarat-titans",
  "gujarat titans": "gujarat-titans",
  kkr: "kolkata-knight-riders",
  "kolkata knight riders": "kolkata-knight-riders",
  lsg: "lucknow-super-giants",
  "lucknow super giants": "lucknow-super-giants",
  mi: "mumbai-indians",
  "mumbai indians": "mumbai-indians",
  pbks: "punjab-kings",
  "punjab kings": "punjab-kings",
  rr: "rajasthan-royals",
  "rajasthan royals": "rajasthan-royals",
  rcb: "royal-challengers-bengaluru",
  "royal challengers bengaluru": "royal-challengers-bengaluru",
  "royal challengers bangalore": "royal-challengers-bengaluru",
  srh: "sunrisers-hyderabad",
  "sunrisers hyderabad": "sunrisers-hyderabad",
};

const TEAM_CACHE_TTL_MS = 60 * 60 * 1000;
const teamCache = new Map();

const normalizeText = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const toNumberOrNull = (value) => {
  const parsed = Number(String(value || "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
};

const resolveTeamSlug = (teamName) => {
  const normalized = normalizeText(teamName);
  return TEAM_SLUGS[normalized] || null;
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

const getCachedTeam = (slug) => {
  const cached = teamCache.get(slug);
  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= Date.now()) {
    teamCache.delete(slug);
    return null;
  }

  return cached.data;
};

const setCachedTeam = (slug, data) => {
  teamCache.set(slug, {
    data,
    expiresAt: Date.now() + TEAM_CACHE_TTL_MS,
  });
};

const fingerprintPlayers = (players) =>
  JSON.stringify(
    (players || [])
      .slice()
      .sort((a, b) => String(a?.name || "").localeCompare(String(b?.name || "")))
      .map((player) => ({
        id: player?.id,
        name: player?.name,
        role: player?.role,
        season: player?.season,
        matches: player?.matches,
        runs: player?.runs,
        wickets: player?.wickets,
        average: player?.average,
        strikeRate: player?.strikeRate,
        economy: player?.economy,
      })),
  );

const parseProfileStats = (lines) => {
  const year = String(new Date().getFullYear());
  const battingIndex = lines.findIndex((line) => /batting\s*&\s*fielding\s*stats/i.test(line));
  const bowlingIndex = lines.findIndex((line) => /^bowling$/i.test(line));

  let battingSeason = null;
  let bowlingSeason = null;

  if (battingIndex >= 0) {
    const battingSlice = lines.slice(battingIndex + 1, bowlingIndex >= 0 ? bowlingIndex : lines.length);
    battingSeason = battingSlice.find((line) => line.startsWith(`${year}\t`)) || null;
  }

  if (bowlingIndex >= 0) {
    const bowlingSlice = lines.slice(bowlingIndex + 1);
    bowlingSeason = bowlingSlice.find((line) => line.startsWith(`${year}\t`)) || null;
  }

  let matches = null;
  let runs = null;
  let wickets = null;
  let average = null;
  let strikeRate = null;
  let economy = null;

  let innings = null;
  let balls = null;
  let fours = null;
  let sixes = null;
  let overs = null;

  const normalizeHeader = (value) =>
    String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

  const buildHeaderIndex = (headerLine) => {
    const cols = String(headerLine || "")
      .split("\t")
      .map((c) => c.trim())
      .filter(Boolean);
    const normalized = cols.map(normalizeHeader);
    const byKey = new Map(normalized.map((k, idx) => [k, idx]));
    return { cols, byKey };
  };

  const toNumberOrZero = (value) => {
    const parsed = toNumberOrNull(value);
    return parsed === null ? 0 : parsed;
  };

  if (battingSeason) {
    const battingSlice = lines.slice(battingIndex + 1, bowlingIndex >= 0 ? bowlingIndex : lines.length);
    const headerLine = battingSlice.find((line) => /\bmat\b/i.test(line) && /\bruns\b/i.test(line)) || null;
    const header = headerLine ? buildHeaderIndex(headerLine) : null;
    const cols = battingSeason.split("\t").map((col) => col.trim());

    const get = (keys, fallbackIndex) => {
      if (header) {
        for (const key of keys) {
          const idx = header.byKey.get(normalizeHeader(key));
          if (idx !== undefined && idx >= 0 && idx < cols.length) {
            return cols[idx];
          }
        }
      }
      return fallbackIndex >= 0 && fallbackIndex < cols.length ? cols[fallbackIndex] : null;
    };

    matches = toNumberOrNull(get(["mat", "matches"], 1));
    innings = toNumberOrNull(get(["inns", "innings"], 2));
    runs = toNumberOrNull(get(["runs", "r"], 4));
    balls = toNumberOrNull(get(["bf", "balls", "ballsplayed"], 7));
    average = toNumberOrNull(get(["avg", "average"], 6));
    strikeRate = toNumberOrNull(get(["sr", "strikerate"], 8));
    fours = toNumberOrNull(get(["4s", "fours"], 11));
    sixes = toNumberOrNull(get(["6s", "sixes"], 12));
  }

  if (bowlingSeason) {
    const bowlingSlice = lines.slice(bowlingIndex + 1);
    const headerLine = bowlingSlice.find((line) => /\bmat\b/i.test(line) && /\bwkts?\b/i.test(line)) || null;
    const header = headerLine ? buildHeaderIndex(headerLine) : null;
    const cols = bowlingSeason.split("\t").map((col) => col.trim());

    const get = (keys, fallbackIndex) => {
      if (header) {
        for (const key of keys) {
          const idx = header.byKey.get(normalizeHeader(key));
          if (idx !== undefined && idx >= 0 && idx < cols.length) {
            return cols[idx];
          }
        }
      }
      return fallbackIndex >= 0 && fallbackIndex < cols.length ? cols[fallbackIndex] : null;
    };

    const bowlingMatches = toNumberOrNull(get(["mat", "matches"], 1));
    overs = toNumberOrNull(get(["overs", "ov"], 2));
    wickets = toNumberOrNull(get(["wkts", "wickets"], 5));
    economy = toNumberOrNull(get(["econ", "economy"], 8));
    if ((matches === null || matches === 0) && bowlingMatches !== null) {
      matches = bowlingMatches;
    }
  }

  return {
    season: year,
    matches: matches ?? 0,
    innings: innings ?? (matches ?? 0),
    balls: balls ?? 0,
    runs: runs ?? 0,
    fours: fours ?? 0,
    sixes: sixes ?? 0,
    wickets: wickets ?? 0,
    overs: overs ?? 0,
    average,
    strikeRate,
    economy,
  };
};

const scrapePlayerProfile = async (browser, profileUrl) => {
  let page;
  try {
    page = await browser.newPage();
    await configurePage(page);
    await page.goto(profileUrl, { waitUntil: "networkidle2", timeout: 90000 });

    const lines = await page.evaluate(() =>
      (document.body?.innerText || "")
        .split("\n")
        .map((line) => String(line || "").trim())
        .filter(Boolean),
    );

    return parseProfileStats(lines);
  } catch {
    return {
      season: String(new Date().getFullYear()),
      matches: 0,
      runs: 0,
      wickets: 0,
      average: null,
      strikeRate: null,
      economy: null,
    };
  } finally {
    if (page) {
      await page.close();
    }
  }
};

const scrapeSquadCards = async (browser, slug) => {
  const page = await browser.newPage();
  try {
    await configurePage(page);
    await page.goto(`https://www.iplt20.com/teams/${slug}`, {
      waitUntil: "networkidle2",
      timeout: 90000,
    });

    const cards = await page.evaluate(() => {
      const normalizeRole = (text) => {
        const value = String(text || "").replace(/\s+/g, " ").trim();
        if (/wk/i.test(value) && /batter|batsman/i.test(value)) return "WK-Batter";
        if (/all/i.test(value)) return "All-Rounder";
        if (/bowler/i.test(value)) return "Bowler";
        if (/batter|batsman/i.test(value)) return "Batter";
        return value || "Player";
      };

      const cardNodes = Array.from(document.querySelectorAll(".ih-pcard1"));

      return cardNodes.map((card) => {
        const anchor = card.querySelector("a[href*='/players/']");
        const hrefRaw = anchor?.getAttribute("href") || "";
        const href = hrefRaw.trim();
        const profileUrl = href.startsWith("http") ? href : `https://www.iplt20.com${href}`;

        const name =
          String(anchor?.getAttribute("data-player_name") || "").trim() ||
          String(card.querySelector("h2, h3, h4")?.textContent || "")
            .replace(/\s+/g, " ")
            .trim();

        const role = normalizeRole(
          String(card.textContent || "")
            .replace(name, "")
            .replace(/\s+/g, " "),
        );

        const imageEl = card.querySelector("img[data-src*='IPLHeadshot'], img[src*='IPLHeadshot']");
        const image = imageEl?.getAttribute("data-src") || imageEl?.getAttribute("src") || null;

        const idMatch = profileUrl.match(/\/(\d+)\/?$/);
        const id = idMatch?.[1] || name;

        return {
          id,
          name,
          role,
          image,
          profileUrl,
        };
      });
    });

    return cards.filter((card) => card?.name && card?.profileUrl);
  } finally {
    await page.close();
  }
};

export const iplTeamPlayersService = {
  getTeamCatalog() {
    return TEAM_CATALOG.slice();
  },

  resolveTeamSlug,

  async scrapeTeamPlayersWithStats(teamName, options = {}) {
    const forceRefresh = Boolean(options?.forceRefresh);
    const slug = resolveTeamSlug(teamName);
    if (!slug) {
      return [];
    }

    if (!forceRefresh) {
      const cached = getCachedTeam(slug);
      if (cached) {
        return cached;
      }
    }

    let browser;
    try {
      browser = await launchBrowser();
      const squadCards = await scrapeSquadCards(browser, slug);

      const players = [];
      for (const card of squadCards) {
        const profile = await scrapePlayerProfile(browser, card.profileUrl);
        players.push({
          id: card.id,
          name: card.name,
          role: card.role,
          image: card.image,
          season: profile.season,
          matches: profile.matches,
          innings: profile.innings,
          balls: profile.balls,
          runs: profile.runs,
          fours: profile.fours,
          sixes: profile.sixes,
          wickets: profile.wickets,
          overs: profile.overs,
          average: profile.average,
          strikeRate: profile.strikeRate,
          economy: profile.economy,
          profileUrl: card.profileUrl,
        });
      }

      setCachedTeam(slug, players);
      return players;
    } catch {
      return [];
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  },

  async refreshAllTeams() {
    let changedTeams = 0;

    for (const team of TEAM_CATALOG) {
      const previous = getCachedTeam(team.slug) || [];
      const before = fingerprintPlayers(previous);
      const next = await this.scrapeTeamPlayersWithStats(team.name, { forceRefresh: true });
      const after = fingerprintPlayers(next);
      if (before !== after) {
        changedTeams += 1;
      }
    }

    return {
      changedTeams,
      totalTeams: TEAM_CATALOG.length,
    };
  },
};
