import puppeteer from "puppeteer";

const url = "https://www.iplt20.com/teams/chennai-super-kings";
const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
const page = await browser.newPage();
await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36");
await page.setExtraHTTPHeaders({ "accept-language": "en-US,en;q=0.9" });
await page.goto(url, { waitUntil: "networkidle2", timeout: 90000 });
const data = await page.evaluate(() => {
  const text = document.body?.innerText || "";
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const imgs = Array.from(document.querySelectorAll("img")).map((img) => ({ src: img.getAttribute("src"), alt: img.getAttribute("alt"), cls: img.className })).filter((x) => x.src).slice(0, 80);
  const cards = Array.from(document.querySelectorAll("a,div,li,article")).map((el) => ({
    cls: (el.className || "").toString(),
    text: (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 160),
    img: el.querySelector("img")?.getAttribute("src") || null,
  })).filter((x) => /player|squad|wicket|all rounder|batsman|bowler/i.test(x.cls + " " + x.text)).slice(0, 80);

  const jsonLd = Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map((s) => s.textContent || "");
  return { title: document.title, linePreview: lines.slice(0, 220), imgs, cards, jsonLd };
});
console.log(JSON.stringify(data, null, 2));
await browser.close();
