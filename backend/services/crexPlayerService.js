import puppeteer from "puppeteer";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  getSupabaseAdminClient,
  isSupabaseConfigured,
  isSupabaseWriteConfigured,
} from "../config/supabase.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CACHE_DIR = path.join(__dirname, "..", "..", ".cache", "ipl");
const PLAYER_INNINGS_CACHE = path.join(CACHE_DIR, "player_innings.json");
const PLAYER_OPPONENT_CACHE = path.join(CACHE_DIR, "player_opponent_stats.json");

const PLAYER_SOURCE_FILE = path.join(__dirname, "..", "..", "public", "assets", "players", "all players.txt");

const SUPABASE_FEED_KEY = "ipl_players_crex_2026";

const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

// ─── IPL 2026 Player → crex.com slug mapping ──────────────────────────────
// Format: { nameKey: string, crexSlug: string, team: string, role: string }
const IPL_PLAYER_CREX_MAP = [];

const normalizeNameKey = (v) => String(v || "").toLowerCase().replace(/[^a-z0-9]/g, "");

const toHttps = (url) => {
  const raw = String(url || "").trim();
  if (!raw) return "";
  if (raw.startsWith("http://")) return `https://${raw.slice("http://".length)}`;
  return raw;
};

const extractCrexSlugFromUrl = (url) => {
  const raw = toHttps(url);
  const match = raw.match(/crex\.com\/player\/([^/?#]+)/i);
  return match?.[1] ? String(match[1]).trim() : null;
};

const deriveNameKeyFromCrexSlug = (crexSlug) => {
  const slug = String(crexSlug || "").trim();
  if (!slug) return "";
  const parts = slug.split("-").filter(Boolean);
  const withoutId = parts.length >= 2 ? parts.slice(0, -1).join("-") : slug;
  return normalizeNameKey(withoutId);
};

const readPlayerSourceFile = async () => {
  try {
    const raw = await fs.readFile(PLAYER_SOURCE_FILE, "utf8");
    return raw;
  } catch {
    return "";
  }
};

const parsePlayerSource = (rawText) => {
  const lines = String(rawText || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const rows = [];
  let currentTeam = null;

  for (const line of lines) {
    if (!/^https?:\/\//i.test(line)) {
      const maybeTeam = String(line || "").toUpperCase();
      if (IPL_TEAMS[maybeTeam]) {
        currentTeam = maybeTeam;
      }
      continue;
    }

    const crexSlug = extractCrexSlugFromUrl(line);
    if (!crexSlug) continue;

    rows.push({
      nameKey: deriveNameKeyFromCrexSlug(crexSlug),
      crexSlug,
      team: currentTeam,
      role: null,
    });
  }

  const unique = [];
  const seen = new Set();
  for (const row of rows) {
    const key = row.crexSlug;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(row);
  }
  return unique;
};

let IPL_PLAYER_CREX_MAP_LOADED = false;
const ensurePlayerMapLoaded = async () => {
  if (IPL_PLAYER_CREX_MAP_LOADED) return;
  const raw = await readPlayerSourceFile();
  const parsed = parsePlayerSource(raw);
  IPL_PLAYER_CREX_MAP.splice(0, IPL_PLAYER_CREX_MAP.length, ...parsed);
  IPL_PLAYER_CREX_MAP_LOADED = true;
};

const IPL_TEAMS = {
  CSK: "Chennai Super Kings", MI: "Mumbai Indians", RCB: "Royal Challengers Bengaluru",
  KKR: "Kolkata Knight Riders", SRH: "Sunrisers Hyderabad", RR: "Rajasthan Royals",
  PBKS: "Punjab Kings", DC: "Delhi Capitals", LSG: "Lucknow Super Giants", GT: "Gujarat Titans",
};

const resolveOpponentFromUrl = (url) => {
  const slug = String(url || "");
  for (const [code] of Object.entries(IPL_TEAMS)) {
    const lc = code.toLowerCase();
    const patterns = [
      new RegExp(`^${lc}-vs-`),
      new RegExp(`-vs-${lc}-`),
      new RegExp(`-vs-${lc}$`),
    ];
    // The player's team is excluded; the other team is the opponent.
    // We'll detect both teams then remove the player's team.
    if (patterns.some((p) => p.test(slug))) {
      return code;
    }
  }
  return null;
};

const extractTeamsFromMatchSlug = (slug) => {
  const match = slug.match(/^([a-z]+)-vs-([a-z]+)-/);
  if (!match) return { team1: null, team2: null };
  return { team1: match[1].toUpperCase(), team2: match[2].toUpperCase() };
};

// ─── File cache helpers ────────────────────────────────────────────────────
const ensureCacheDir = async () => { await fs.mkdir(CACHE_DIR, { recursive: true }); };

const getSupabase = () => {
  if (!isSupabaseConfigured()) {
    return null;
  }
  return getSupabaseAdminClient();
};

const readFromSupabaseFeed = async () => {
  const supabase = getSupabase();
  if (!supabase) return null;

  const result = await supabase
    .from("ipl_feed_cache")
    .select("payload")
    .eq("feed_key", SUPABASE_FEED_KEY)
    .maybeSingle();

  if (result?.error) {
    return null;
  }

  return result?.data?.payload || null;
};

const writeToSupabaseFeed = async (payload) => {
  const supabase = getSupabase();
  if (!supabase || !isSupabaseWriteConfigured()) return;

  await supabase
    .from("ipl_feed_cache")
    .upsert(
      [{ feed_key: SUPABASE_FEED_KEY, payload, payload_hash: String(Date.now()), updated_at: new Date().toISOString() }],
      { onConflict: "feed_key" },
    );
};

const readCache = async (filePath) => {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch { return null; }
};

const writeCache = async (filePath, data) => {
  try {
    await ensureCacheDir();
    await fs.writeFile(filePath, JSON.stringify({ updatedAt: new Date().toISOString(), data }, null, 2), "utf8");
  } catch { /* ignore */ }
};

// ─── Browser helpers ────────────────────────────────────────────────────────
const launchBrowser = () =>
  puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

const configurePage = async (page) => {
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
  );
  await page.setExtraHTTPHeaders({
    "accept-language": "en-IN,en;q=0.9",
    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  });
  await page.setViewport({ width: 1366, height: 900 });
};

// ─── Scrape crex.com player matches page ────────────────────────────────────
const scrapePlayerMatchPage = async (browser, crexSlug, playerTeam) => {
  const page = await browser.newPage();
  try {
    await configurePage(page);
    await page.goto(`https://crex.com/player/${crexSlug}/matches`, {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    // Wait for match rows to appear
    await page.waitForSelector('[class*="match"], [class*="score"], table tr', { timeout: 12000 }).catch(() => null);
    await page.waitForTimeout(2000);

    // Extract innings data via DOM evaluation
    const inningsData = await page.evaluate((team) => {
      const innings = [];

      // Try to find IPL 2026 section (look for series label containing "IPL 2026")
      const allText = document.body.innerText;

      // Approach 1: find table rows
      const rows = Array.from(document.querySelectorAll("table tr"));
      rows.forEach((row) => {
        const cells = Array.from(row.querySelectorAll("td")).map((td) => td.textContent.trim());
        if (cells.length >= 4) {
          const runsCell = cells.find((c) => /^\d+(\*)?$/.test(c.replace(/\s/g, "")));
          if (runsCell) {
            innings.push({ cells, source: "table" });
          }
        }
      });

      // Approach 2: find crex match cards
      const matchCards = Array.from(document.querySelectorAll("[class*='match-card'], [class*='matchCard'], [class*='playerMatch']"));
      matchCards.forEach((card) => {
        innings.push({ text: card.innerText, source: "card", html: card.innerHTML.substring(0, 500) });
      });

      // Approach 3: Extract recent form from overview-like elements
      // Look for elements containing "R" "B" "4s" "6s" headers pattern
      const container = document.querySelector("[class*='matches'], [class*='innings'], main");
      if (container) {
        innings.push({ containerText: container.innerText.substring(0, 5000) });
      }

      return innings;
    }, playerTeam);

    // Also grab the full page text to parse from it
    const pageText = await page.evaluate(() => document.body.innerText);

    return { inningsData, pageText };
  } catch (err) {
    return { inningsData: [], pageText: "" };
  } finally {
    await page.close();
  }
};

// ─── Scrape a crex scorecard for 4s/6s data ─────────────────────────────────
const scrapeCrexScorecard = async (browser, matchUrl) => {
  const page = await browser.newPage();
  try {
    await configurePage(page);
    await page.goto(matchUrl, { waitUntil: "networkidle2", timeout: 60000 });
    await page.waitForSelector("table tr", { timeout: 15000 }).catch(() => null);
    await page.waitForTimeout(1500);

    const inningsRows = await page.evaluate(() => {
      const results = [];
      const tables = Array.from(document.querySelectorAll("table"));

      for (const table of tables) {
        const headers = Array.from(table.querySelectorAll("th")).map((th) => th.textContent.trim().toLowerCase());
        const hasName = headers.some((h) => h === "batter" || h === "batsman" || h === "player");
        const hasRuns = headers.some((h) => h === "r" || h === "runs");
        if (!hasName && !hasRuns) continue;

        // Find column indices
        const colR = headers.findIndex((h) => h === "r" || h === "runs");
        const colB = headers.findIndex((h) => h === "b" || h === "balls");
        const col4s = headers.findIndex((h) => h === "4s" || h === "fours");
        const col6s = headers.findIndex((h) => h === "6s" || h === "sixes");
        const colSR = headers.findIndex((h) => h.includes("sr") || h.includes("strike"));
        const colName = headers.findIndex((h) => h === "batter" || h === "batsman" || h === "player");

        Array.from(table.querySelectorAll("tbody tr")).forEach((row) => {
          const cells = Array.from(row.querySelectorAll("td")).map((td) => td.textContent.trim());
          if (cells.length < 3) return;
          const name = cells[colName >= 0 ? colName : 0];
          const runs = parseInt(cells[colR >= 0 ? colR : 1]) || 0;
          const balls = parseInt(cells[colB >= 0 ? colB : 2]) || 0;
          const fours = parseInt(cells[col4s >= 0 ? col4s : -1]) || 0;
          const sixes = parseInt(cells[col6s >= 0 ? col6s : -1]) || 0;
          const sr = parseFloat(cells[colSR >= 0 ? colSR : -1]) || (balls > 0 ? ((runs / balls) * 100) : 0);
          if (name && (runs > 0 || balls > 0)) {
            results.push({ name, runs, balls, fours, sixes, sr: parseFloat(sr.toFixed(2)) });
          }
        });

        if (results.length > 0) break;
      }
      return results;
    });

    return inningsRows;
  } catch {
    return [];
  } finally {
    await page.close();
  }
};

// ─── Parse crex match list from page text ──────────────────────────────────
const parseInningsFromPageText = (pageText, playerTeam) => {
  // crex.com shows recent form like:
  // "19 (13)"  "vs DC" "18 Apr"
  // or the match cards show: "26th T20 vs DC" "19 (13)" with date
  const innings = [];
  const lines = pageText.split("\n").map((l) => l.trim()).filter(Boolean);

  // Find IPL 2026 section
  let iplStart = lines.findIndex((l) => /ipl\s+2026/i.test(l));
  if (iplStart < 0) iplStart = 0;

  // Pattern: "runs (balls)" like "19 (13)" or "19 (13)*"
  const scorePattern = /^(\d+)\*?\s*\((\d+)\)$/;
  // VS pattern: "vs CSK" or "26th T20 vs DC"
  const vsPattern = /vs\s+([A-Z]{2,4})/i;
  // Date pattern: "18 Apr" or "5 Apr 2026"
  const datePattern = /(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)(?:\s+\d{4})?)/i;

  for (let i = iplStart; i < lines.length; i++) {
    const line = lines[i];
    const scoreMatch = line.match(scorePattern);
    if (!scoreMatch) continue;

    const runs = parseInt(scoreMatch[1]);
    const balls = parseInt(scoreMatch[2]);
    const sr = balls > 0 ? parseFloat(((runs / balls) * 100).toFixed(2)) : 0;

    // Look around for opponent and date
    let opponent = null;
    let matchDate = null;
    let matchUrl = null;

    for (let j = Math.max(0, i - 3); j <= Math.min(lines.length - 1, i + 3); j++) {
      const nearby = lines[j];
      const vsM = nearby.match(vsPattern);
      if (vsM && !opponent) {
        opponent = vsM[1].toUpperCase();
      }
      const dtM = nearby.match(datePattern);
      if (dtM && !matchDate) {
        matchDate = dtM[1];
      }
    }

    if (opponent && opponent !== playerTeam) {
      innings.push({
        runs,
        balls,
        sr,
        fours: 0, // fill later from scorecard
        sixes: 0,
        opponent,
        date: matchDate || "Unknown",
        matchUrl: null,
      });
    }
  }

  return innings;
};

// ─── Parse from crex recent form (visible on overview page too) ─────────────
const parseRecentFormFromProfileText = (pageText, playerTeam) => {
  const innings = [];
  // The profile page shows:
  // [19 (13)](match-url)  → but in plain text it's just "19 (13)"
  // Followed by match URL
  const lines = pageText.split("\n").map((l) => l.trim()).filter(Boolean);

  const scorePattern = /^(\d+)\*?\s*\((\d+)\)$/;
  const vsPattern = /vs\s+([A-Z]{2,4})/i;
  const matchUrlPattern = /crex\.com\/cricket-live-score\/([a-z0-9-]+)/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const scoreMatch = line.match(scorePattern);
    if (!scoreMatch) continue;

    const runs = parseInt(scoreMatch[1]);
    const balls = parseInt(scoreMatch[2]);
    const sr = balls > 0 ? parseFloat(((runs / balls) * 100).toFixed(2)) : 0;

    let opponent = null;
    let matchSlug = null;

    for (let j = Math.max(0, i - 2); j <= Math.min(lines.length - 1, i + 2); j++) {
      const vs = lines[j].match(vsPattern);
      if (vs) opponent = vs[1].toUpperCase();
      const mu = lines[j].match(matchUrlPattern);
      if (mu) matchSlug = mu[1];
    }

    if (!opponent && matchSlug) {
      const { team1, team2 } = extractTeamsFromMatchSlug(matchSlug);
      if (team1 === playerTeam) opponent = team2;
      else if (team2 === playerTeam) opponent = team1;
    }

    if (opponent && IPL_TEAMS[opponent]) {
      innings.push({ runs, balls, sr, fours: 0, sixes: 0, opponent, matchSlug });
    }
  }

  return innings;
};

// ─── Compute per-opponent aggregates ─────────────────────────────────────────
const computeOpponentStats = (innings) => {
  const byTeam = {};

  for (const inn of innings) {
    const opp = inn.opponent;
    if (!opp) continue;
    if (!byTeam[opp]) {
      byTeam[opp] = { opponent: opp, innings: 0, totalRuns: 0, totalBalls: 0, totalFours: 0, totalSixes: 0 };
    }
    byTeam[opp].innings += 1;
    byTeam[opp].totalRuns += inn.runs;
    byTeam[opp].totalBalls += inn.balls;
    byTeam[opp].totalFours += inn.fours;
    byTeam[opp].totalSixes += inn.sixes;
  }

  return Object.values(byTeam).map((stat) => ({
    opponent: stat.opponent,
    opponentName: IPL_TEAMS[stat.opponent] || stat.opponent,
    innings: stat.innings,
    avgRuns: stat.innings > 0 ? parseFloat((stat.totalRuns / stat.innings).toFixed(2)) : 0,
    avgSR: stat.totalBalls > 0 ? parseFloat(((stat.totalRuns / stat.totalBalls) * 100).toFixed(2)) : 0,
    totalFours: stat.totalFours,
    totalSixes: stat.totalSixes,
    totalRuns: stat.totalRuns,
  }));
};

// ─── Scrape a single player ───────────────────────────────────────────────────
const scrapePlayer = async (browser, playerMeta) => {
  const { nameKey, crexSlug, team, role } = playerMeta;

  // First get the profile/overview page to get recent form
  const profilePage = await browser.newPage();
  let profileText = "";
  let recentMatchUrls = [];

  try {
    await configurePage(profilePage);
    await profilePage.goto(`https://crex.com/player/${crexSlug}`, {
      waitUntil: "networkidle2",
      timeout: 60000,
    });
    await profilePage.waitForTimeout(2000);

    // Extract recent form links and page text
    const result = await profilePage.evaluate(() => {
      const text = document.body.innerText;
      const links = Array.from(document.querySelectorAll("a[href*='/cricket-live-score/']"))
        .map((a) => ({
          href: a.href,
          text: a.textContent.trim(),
        }))
        .filter((l) => l.href.includes("indian-premier-league-2026"))
        .slice(0, 10);
      return { text, links };
    });

    profileText = result.text;
    recentMatchUrls = result.links.map((l) => l.href);
  } catch {
    profileText = "";
  } finally {
    await profilePage.close();
  }

  // Parse innings from profile page text
  const innings = parseRecentFormFromProfileText(profileText, team);

  const normalizedPlayerNameKey = nameKey || deriveNameKeyFromCrexSlug(crexSlug);
  const scorecardUrls = Array.from(new Set(recentMatchUrls)).slice(0, 10);
  const scorecardRowsByMatchSlug = new Map();
  for (const url of scorecardUrls) {
    try {
      const rows = await scrapeCrexScorecard(browser, url);
      if (!rows || rows.length === 0) continue;
      const slugMatch = String(url).match(/\/cricket-live-score\/([^/?#]+)/i);
      const matchSlug = slugMatch?.[1] ? String(slugMatch[1]) : url;
      scorecardRowsByMatchSlug.set(matchSlug, rows);
    } catch {
      // ignore
    }
  }

  const enrichInnings = (inn) => {
    const matchSlug = inn?.matchSlug ? String(inn.matchSlug) : null;
    if (!matchSlug) return inn;
    const rows = scorecardRowsByMatchSlug.get(matchSlug);
    if (!rows) return inn;
    const best = rows
      .map((row) => ({
        row,
        key: normalizeNameKey(row?.name),
      }))
      .find((item) => item.key && (item.key.includes(normalizedPlayerNameKey) || normalizedPlayerNameKey.includes(item.key)));
    if (!best?.row) return inn;
    return {
      ...inn,
      runs: Number.isFinite(Number(best.row.runs)) ? Number(best.row.runs) : inn.runs,
      balls: Number.isFinite(Number(best.row.balls)) ? Number(best.row.balls) : inn.balls,
      fours: Number.isFinite(Number(best.row.fours)) ? Number(best.row.fours) : inn.fours,
      sixes: Number.isFinite(Number(best.row.sixes)) ? Number(best.row.sixes) : inn.sixes,
      sr: Number.isFinite(Number(best.row.sr)) ? Number(best.row.sr) : inn.sr,
      matchUrl: inn.matchUrl || null,
    };
  };

  const inningsEnriched = innings.map(enrichInnings);

  // Compute stats
  const opponentStats = computeOpponentStats(inningsEnriched);
  const favouriteTarget = opponentStats.length > 0
    ? opponentStats.reduce((best, curr) => (curr.avgRuns > best.avgRuns ? curr : best), opponentStats[0])
    : null;

  return {
    nameKey,
    crexSlug,
    team,
    role,
    innings: inningsEnriched.slice(0, 10),
    opponentStats,
    favouriteTarget: favouriteTarget ? {
      opponent: favouriteTarget.opponent,
      opponentName: favouriteTarget.opponentName,
      avgRuns: favouriteTarget.avgRuns,
    } : null,
    lastScraped: new Date().toISOString(),
  };
};

// ─── In-memory cache ─────────────────────────────────────────────────────────
let _cachedData = null;
let _cacheExpiry = 0;
let _inFlight = null;

// ─── Public API ──────────────────────────────────────────────────────────────
export const crexPlayerService = {
  getPlayerList() {
    return IPL_PLAYER_CREX_MAP.slice();
  },

  findPlayerMeta(playerName) {
    const key = normalizeNameKey(playerName);
    return (
      IPL_PLAYER_CREX_MAP.find((p) => p.nameKey === key) ||
      IPL_PLAYER_CREX_MAP.find((p) => key.includes(p.nameKey) || p.nameKey.includes(key)) ||
      null
    );
  },

  async getAllPlayerData(forceRefresh = false) {
    await ensurePlayerMapLoaded();
    if (!forceRefresh && _cachedData && _cacheExpiry > Date.now()) {
      return _cachedData;
    }

    if (!forceRefresh && _inFlight) {
      return _inFlight;
    }

    // Try file cache
    if (!forceRefresh) {
      const supabasePayload = await readFromSupabaseFeed();
      if (Array.isArray(supabasePayload) && supabasePayload.length > 0) {
        _cachedData = supabasePayload;
        _cacheExpiry = Date.now() + CACHE_TTL_MS;
        return _cachedData;
      }

      const fileCache = await readCache(PLAYER_INNINGS_CACHE);
      if (fileCache?.data && fileCache?.updatedAt) {
        const age = Date.now() - new Date(fileCache.updatedAt).getTime();
        if (age < CACHE_TTL_MS) {
          _cachedData = fileCache.data;
          _cacheExpiry = Date.now() + (CACHE_TTL_MS - age);
          return _cachedData;
        }
      }
    }

    _inFlight = (async () => {
      let browser;
      const results = [];
      try {
        browser = await launchBrowser();
        for (const playerMeta of IPL_PLAYER_CREX_MAP) {
          try {
            const data = await scrapePlayer(browser, playerMeta);
            results.push(data);
          } catch (e) {
            console.error(`Failed to scrape ${playerMeta.nameKey}:`, e.message);
            results.push({
              nameKey: playerMeta.nameKey,
              crexSlug: playerMeta.crexSlug,
              team: playerMeta.team,
              role: playerMeta.role,
              innings: [],
              opponentStats: [],
              favouriteTarget: null,
              lastScraped: new Date().toISOString(),
            });
          }
        }
      } finally {
        if (browser) await browser.close();
        _inFlight = null;
      }

      await writeCache(PLAYER_INNINGS_CACHE, results);
      await writeToSupabaseFeed(results);
      _cachedData = results;
      _cacheExpiry = Date.now() + CACHE_TTL_MS;
      return results;
    })();

    return _inFlight;
  },

  async getPlayerData(playerName, forceRefresh = false) {
    await ensurePlayerMapLoaded();
    const meta = this.findPlayerMeta(playerName);
    if (!meta) return null;

    const all = await this.getAllPlayerData(forceRefresh);
    return all.find((p) => p.nameKey === meta.nameKey) || null;
  },

  async getPlayerInnings(crexSlug) {
    await ensurePlayerMapLoaded();
    // Try from cache first
    const fileCache = await readCache(PLAYER_INNINGS_CACHE);
    if (fileCache?.data) {
      const input = String(crexSlug || "").trim();
      const inputKey = normalizeNameKey(input);
      const found =
        fileCache.data.find((p) => String(p.crexSlug) === input) ||
        fileCache.data.find((p) => String(p.nameKey) === inputKey) ||
        null;
      if (found) return found;
    }

    const supabasePayload = await readFromSupabaseFeed();
    if (Array.isArray(supabasePayload)) {
      const input = String(crexSlug || "").trim();
      const inputKey = normalizeNameKey(input);
      const found =
        supabasePayload.find((p) => String(p.crexSlug) === input) ||
        supabasePayload.find((p) => String(p.nameKey) === inputKey) ||
        null;
      if (found) return found;
    }

    return null;
  },
};
