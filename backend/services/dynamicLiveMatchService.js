import puppeteer from "puppeteer";

const CACHE_TTL_MS = 1000; // 1 second for real-time updates
const cacheByUrl = new Map();
const inFlightByUrl = new Map();

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
  if (start < 0) return "";

  let depth = 0;
  let out = "";
  for (let i = start; i < raw.length; i += 1) {
    const ch = raw[i];
    out += ch;
    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) break;
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

const parseStructuredLiveData = (pageText) => {
  const blob = findEmbeddedChunk(pageText);
  if (!blob) return null;

  const team1 = readEncodedField(blob, "team1short") || readEncodedField(blob, "team1") || null;
  const team2 = readEncodedField(blob, "team2short") || readEncodedField(blob, "team2") || null;
  const score1 = readEncodedField(blob, "score1");
  const over1 = readEncodedField(blob, "over1");
  const score2 = readEncodedField(blob, "score2");
  const over2 = readEncodedField(blob, "over2");

  const batter1Name = readEncodedField(blob, "pname1");
  const batter1Runs = readEncodedField(blob, "run1");
  const batter1Balls = readEncodedField(blob, "ball1")?.replace(/[^0-9]/g, "") || "0";
  const batter2Name = readEncodedField(blob, "pname2");
  const batter2Runs = readEncodedField(blob, "run2");
  const batter2Balls = readEncodedField(blob, "ball2")?.replace(/[^0-9]/g, "") || "0";

  const bowlerName = readEncodedField(blob, "bname") || readEncodedField(blob, "lbname") || null;
  const bowlerWickets = readEncodedField(blob, "bwicket") || readEncodedField(blob, "lbwicket") || "0";
  const bowlerRuns = readEncodedField(blob, "brun") || readEncodedField(blob, "lbrun") || "0";
  const bowlerOversRaw = readEncodedField(blob, "bover") || readEncodedField(blob, "lbover") || "0";
  
  // Format overs as float (e.g., "2" -> "2.0", "2.3" -> "2.3")
  const bowlerOvers = bowlerOversRaw.includes(".") ? bowlerOversRaw : `${bowlerOversRaw}.0`;

  const crr = readEncodedField(blob, "crr");
  const rrr = readEncodedField(blob, "rrr");
  const partnerRuns = readEncodedField(blob, "partnerruns");
  const partnerBalls = readEncodedField(blob, "partnerballs");

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
          wickets: Number(bowlerWickets) || 0,
          runs: Number(bowlerRuns) || 0,
          overs: bowlerOvers,
        },
      ]
    : [];

  return {
    team1,
    team2,
    team1Score: score1 || null,
    team2Score: score2 || null,
    team1Overs: over1 || null,
    team2Overs: over2 || null,
    batters,
    bowlers,
    liveStats: {
      currentRunRate: crr || null,
      requiredRunRate: rrr || null,
      partnership: partnerRuns && partnerBalls ? `${partnerRuns}(${partnerBalls})` : null,
    },
  };
};

const parseCommentary = (text) => {
  const raw = String(text || "")
    .replace(/\s+/g, " ")
    .trim();

  // Split by over numbers (e.g., "13.2", "13.1")
  const pieces = raw.split(/(?=\b\d{1,2}\.\d\b)/g);
  const rows = [];

  for (const piece of pieces) {
    const trimmed = String(piece || "").trim();
    // Match pattern: "13.2 Some commentary text"
    const hit = trimmed.match(/^(\d{1,2}\.\d)\s+(.+)$/);
    if (!hit) continue;

    const over = hit[1];
    let textPart = String(hit[2] || "")
      .replace(/\s+/g, " ")
      .replace(/^[-:]+\s*/, "")
      .trim();

    // Remove common prefixes
    textPart = textPart.replace(/^(to\s+[A-Za-z\s]+,?\s*)/i, "");
    
    if (!textPart || textPart.length < 4) continue;
    rows.push({ over, text: textPart.slice(0, 300) });
  }

  return rows.slice(0, 40);
};

const extractBallByBallTimeline = async (page) => {
  try {
    // Look for ball-by-ball timeline in the page
    const ballData = await page.evaluate(() => {
      const balls = [];
      
      // Method 1: Look for ball circles/badges with run values
      const ballElements = document.querySelectorAll('[class*="ball"], [class*="run"], [class*="over-ball"]');
      for (const el of ballElements) {
        const text = el.textContent?.trim();
        if (text && /^[0-6WwNb]$/.test(text)) {
          balls.push(text.toUpperCase());
        }
      }
      
      // Method 2: Look for specific ball timeline structure
      if (balls.length === 0) {
        const timelineElements = document.querySelectorAll('.ball-timeline span, .over-summary span, [data-ball]');
        for (const el of timelineElements) {
          const text = el.textContent?.trim();
          if (text && /^[0-6WwNb]$/.test(text)) {
            balls.push(text.toUpperCase());
          }
        }
      }
      
      // Method 3: Parse from text content
      if (balls.length === 0) {
        const bodyText = document.body.innerText;
        const overMatch = bodyText.match(/Over\s+\d+[:\s]+([0-6WwNb\s,]+)/gi);
        if (overMatch) {
          for (const match of overMatch) {
            const runs = match.match(/[0-6WwNb]/gi);
            if (runs) {
              balls.push(...runs.map(r => r.toUpperCase()));
            }
          }
        }
      }
      
      return balls;
    });
    
    return ballData.slice(-6); // Return last 6 balls
  } catch (error) {
    console.error('Error extracting ball timeline:', error);
    return [];
  }
};

const extractCurrentBowlerFromPage = async (page) => {
  try {
    const bowlerData = await page.evaluate(() => {
      // Look for current bowler section
      const bowlerSection = document.querySelector('[class*="current-bowler"], [class*="bowling-now"]');
      if (bowlerSection) {
        const name = bowlerSection.querySelector('[class*="name"]')?.textContent?.trim();
        const figures = bowlerSection.querySelector('[class*="figures"]')?.textContent?.trim();
        const overs = bowlerSection.querySelector('[class*="overs"]')?.textContent?.trim();
        
        if (name) {
          return { name, figures, overs };
        }
      }
      
      // Fallback: Look in text for pattern like "N Yadav 1-0 (0.1)"
      const bodyText = document.body.innerText;
      const bowlerMatch = bodyText.match(/([A-Z][A-Za-z\s.]+?)\s+(\d+-\d+)\s*\((\d+\.?\d*)\)/);
      if (bowlerMatch) {
        return {
          name: bowlerMatch[1].trim(),
          figures: bowlerMatch[2],
          overs: bowlerMatch[3],
        };
      }
      
      return null;
    });
    
    if (bowlerData && bowlerData.figures) {
      const [wickets, runs] = bowlerData.figures.split('-').map(Number);
      return {
        name: bowlerData.name,
        wickets: wickets || 0,
        runs: runs || 0,
        overs: bowlerData.overs || "0.0",
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting current bowler:', error);
    return null;
  }
};

const parseScorecardBatting = (text) => {
  const lines = String(text || "")
    .split("\n")
    .map((line) => String(line || "").replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const batters = [];
  const batterRegex = /^([A-Za-z][A-Za-z.'\-\s]+?)\s+(\d{1,3})\s+(\d{1,3})\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,3}(?:\.\d+)?)$/;

  for (const line of lines) {
    const hit = line.match(batterRegex);
    if (!hit) continue;

    batters.push({
      name: String(hit[1] || "").trim(),
      runs: Number(hit[2] || 0),
      balls: Number(hit[3] || 0),
      fours: Number(hit[4] || 0),
      sixes: Number(hit[5] || 0),
      strikeRate: Number(hit[6] || 0),
    });
  }

  return batters;
};

const parseScorecardBowling = (text) => {
  const lines = String(text || "")
    .split("\n")
    .map((line) => String(line || "").replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const bowlers = [];
  const bowlerRegex = /^([A-Za-z][A-Za-z.'\-\s]+?)\s+(\d{1,2}(?:\.\d+)?)\s+(\d{1,2})\s+(\d{1,3})\s+(\d{1,2})\s+(\d{1,2}(?:\.\d+)?)$/;

  for (const line of lines) {
    const hit = line.match(bowlerRegex);
    if (!hit) continue;

    const oversRaw = String(hit[2] || "0");
    // Ensure overs are in float format
    const overs = oversRaw.includes(".") ? oversRaw : `${oversRaw}.0`;

    bowlers.push({
      name: String(hit[1] || "").trim(),
      overs,
      maidens: Number(hit[3] || 0),
      runs: Number(hit[4] || 0),
      wickets: Number(hit[5] || 0),
      economy: Number(hit[6] || 0),
    });
  }

  return bowlers;
};

const launchBrowser = async () =>
  puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

const configurePage = async (page) => {
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
  );
  await page.setExtraHTTPHeaders({
    "accept-language": "en-US,en;q=0.9",
  });
  await page.setViewport({ width: 1366, height: 900 });
};

export const dynamicLiveMatchService = {
  async scrapeLiveMatch(url, options = {}) {
    const forceFresh = Boolean(options?.forceFresh);
    const now = Date.now();
    const cached = cacheByUrl.get(url);

    if (!forceFresh && cached?.data && cached.expiresAt > now) {
      return { ...cached.data, _meta: { cacheHit: true } };
    }

    if (!forceFresh && inFlightByUrl.has(url)) {
      const pending = await inFlightByUrl.get(url);
      return { ...pending, _meta: { cacheHit: true } };
    }

    const request = (async () => {
      let browser;

      try {
        browser = await launchBrowser();
        const page = await browser.newPage();
        await configurePage(page);

        await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
        await sleep(1500);

        const payload = await page.evaluate(() => {
          const text = String(document.body?.innerText || "");
          const lines = text
            .split("\n")
            .map((line) => String(line || "").replace(/\s+/g, " ").trim())
            .filter(Boolean);
          return { text, lines };
        });

        const pageText = String(payload?.text || "");
        const lines = payload?.lines || [];
        const structured = parseStructuredLiveData(pageText);
        const commentary = parseCommentary(pageText);
        
        // Extract ball-by-ball timeline from page
        const ballTimeline = await extractBallByBallTimeline(page);
        console.log('📊 Ball timeline extracted:', ballTimeline);
        
        // Extract current bowler from page
        const pageBowler = await extractCurrentBowlerFromPage(page);
        console.log('🎯 Current bowler extracted:', pageBowler);
        
        // Use page bowler if found, otherwise use structured data
        const currentBowler = pageBowler || (structured?.bowlers?.[0] ? structured.bowlers[0] : null);
        console.log('🎯 Final bowler:', currentBowler);
        
        // Use ball timeline if found, otherwise extract from commentary
        let last6Balls = ballTimeline.length > 0 ? ballTimeline : [];
        
        // If no balls from timeline, try extracting from commentary more aggressively
        if (last6Balls.length === 0 && commentary.length > 0) {
          console.log('⚠️ No ball timeline found, extracting from commentary...');
          const ballsFromCommentary = [];
          
          // Go through all commentary entries (not just first 12)
          for (const entry of commentary) {
            const text = String(entry?.text || "").toUpperCase();
            const over = String(entry?.over || "");
            
            // More comprehensive ball detection
            if (/\bFOUR\b|BOUNDARY|FOUR RUNS|4 RUNS/i.test(text)) {
              ballsFromCommentary.push("4");
            } else if (/\bSIX\b|MAXIMUM|SIX RUNS|6 RUNS/i.test(text)) {
              ballsFromCommentary.push("6");
            } else if (/\bWICKET\b|\bOUT\b|\bBOWLED\b|\bCAUGHT\b|\bLBW\b|\bRUN OUT\b/i.test(text)) {
              ballsFromCommentary.push("W");
            } else if (/\bNO RUN\b|\bDOT BALL\b|\bDOT\b|NO RUNS?/i.test(text)) {
              ballsFromCommentary.push("0");
            } else if (/\bSINGLE\b|ONE RUN|1 RUN/i.test(text)) {
              ballsFromCommentary.push("1");
            } else if (/\bTWO\b|TWO RUNS|2 RUNS/i.test(text)) {
              ballsFromCommentary.push("2");
            } else if (/\bTHREE\b|THREE RUNS|3 RUNS/i.test(text)) {
              ballsFromCommentary.push("3");
            } else if (/\bFIVE\b|FIVE RUNS|5 RUNS/i.test(text)) {
              ballsFromCommentary.push("5");
            }
            
            // Stop when we have enough balls
            if (ballsFromCommentary.length >= 12) break;
          }
          
          last6Balls = ballsFromCommentary.slice(-6);
          console.log('📊 Balls extracted from commentary:', last6Balls);
        }
        
        // Ensure we always have the last 6 balls
        last6Balls = last6Balls.slice(-6);
        
        // If still no balls, log warning but don't use dummy data
        if (last6Balls.length === 0) {
          console.log('⚠️ WARNING: No ball data could be extracted from page or commentary');
        } else {
          console.log('✅ Final last 6 balls:', last6Balls);
        }

        // Fetch scorecard
        const scorecardUrl = url.replace(/\/$/, "") + "/match-scorecard";
        let fullScorecard = { team1: [], team2: [] };

        try {
          await page.goto(scorecardUrl, { waitUntil: "networkidle2", timeout: 30000 });
          await sleep(1000);

          const scorecardText = await page.evaluate(() => String(document.body?.innerText || ""));
          const team1Batters = parseScorecardBatting(scorecardText);
          const team1Bowlers = parseScorecardBowling(scorecardText);

          fullScorecard = {
            team1: { batters: team1Batters, bowlers: team1Bowlers },
            team2: { batters: [], bowlers: [] },
          };
        } catch (scorecardError) {
          console.error("Scorecard fetch failed:", scorecardError.message);
        }

        const statusLine = lines.find((line) => /live|innings break|won by|result/i.test(line)) || "Live";
        const venueLine = lines.find((line) => /stadium|ground/i.test(line) && line.length < 100) || "Venue unavailable";

        const result = {
          id: url.split("/").pop() || `match-${Date.now()}`,
          sourceUrl: url,
          team1: structured?.team1 || "Team A",
          team2: structured?.team2 || "Team B",
          team1Score: structured?.team1Score || null,
          team2Score: structured?.team2Score || null,
          team1Overs: structured?.team1Overs || null,
          team2Overs: structured?.team2Overs || null,
          status: /live|in progress/i.test(statusLine) ? "Live" : /won by|result/i.test(statusLine) ? "Completed" : "Live",
          venue: venueLine,
          fetchedAt: new Date().toISOString(),
          scoreboard: {
            batters: structured?.batters || [],
            bowlers: currentBowler ? [currentBowler] : [],
            commentary,
            last6Balls,
            liveStats: structured?.liveStats || {},
            fullScorecard,
          },
        };

        cacheByUrl.set(url, {
          data: result,
          expiresAt: Date.now() + CACHE_TTL_MS,
        });

        return { ...result, _meta: { cacheHit: false } };
      } finally {
        if (browser) {
          await browser.close();
        }
      }
    })();

    inFlightByUrl.set(url, request);
    try {
      return await request;
    } finally {
      inFlightByUrl.delete(url);
    }
  },
};
