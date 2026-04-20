import puppeteer from "puppeteer";

const urls = [
  "https://www.cricbuzz.com/cricket-series/9241/indian-premier-league-2026/stats",
  "https://www.cricbuzz.com/cricket-series/9241/indian-premier-league-2026/squads",
  "https://www.cricbuzz.com/cricket-series/9241/indian-premier-league-2026/news",
  "https://www.cricbuzz.com/cricket-series/9241/indian-premier-league-2026/matches"
];

const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
const page = await browser.newPage();
await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36");
await page.setExtraHTTPHeaders({ "accept-language": "en-US,en;q=0.9", "upgrade-insecure-requests": "1" });

for (const url of urls) {
  await page.goto(url, { waitUntil: "networkidle2", timeout: 90000 });
  const data = await page.evaluate(() => {
    const text = document.body?.innerText || "";
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    return {
      title: document.title,
      lineCount: lines.length,
      firstLines: lines.slice(0, 160),
      matchInfoLines: lines.filter((l) => /match\s*•/i.test(l)).slice(0, 30),
      scoreLines: lines.filter((l) => /^\d{1,3}-\d{1,2}(\s*\(\d+(\.\d+)?\))?$/.test(l)).slice(0, 30),
      statLines: lines.filter((l) => /most runs|most wickets|highest score|best bowling|orange cap|purple cap/i.test(l)).slice(0, 40),
      newsishLines: lines.filter((l) => /\d{1,2}\s+hrs?\s+ago|\d{1,2}\s+days?\s+ago|read more/i.test(l)).slice(0, 40),
    };
  });

  console.log("===URL===");
  console.log(url);
  console.log(JSON.stringify(data, null, 2));
}

await browser.close();
