import puppeteer from "puppeteer";

const url = "https://www.iplt20.com/teams/chennai-super-kings";
const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
const page = await browser.newPage();
await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36");
await page.goto(url, { waitUntil: "networkidle2", timeout: 90000 });
const data = await page.evaluate(() => {
  const cards = Array.from(document.querySelectorAll('.ih-pcard1')).slice(0, 8).map((card) => {
    const name = card.querySelector('h2,h3,h4,.ih-p-name,.player-name')?.textContent || card.querySelector('a')?.textContent || '';
    const text = (card.textContent || '').replace(/\s+/g, ' ').trim();
    const imgs = Array.from(card.querySelectorAll('img')).map((img) => ({src: img.getAttribute('src'), dataSrc: img.getAttribute('data-src'), cls: img.className, alt: img.getAttribute('alt')}));
    return { cls: card.className, name, text, imgs, html: card.innerHTML.slice(0,500)};
  });

  const scripts = Array.from(document.querySelectorAll('script')).map((s) => s.textContent || '').filter((s) => s.includes('IPLHeadshot2026') || s.includes('squad') || s.includes('player'));
  return {cards, scripts: scripts.slice(0,5)};
});
console.log(JSON.stringify(data, null, 2));
await browser.close();
