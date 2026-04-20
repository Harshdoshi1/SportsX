import puppeteer from "puppeteer";
const url = "https://www.iplt20.com/players/virat-kohli/164";
const browser = await puppeteer.launch({headless:true,args:["--no-sandbox","--disable-setuid-sandbox"]});
const page = await browser.newPage();
await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36");
await page.goto(url,{waitUntil:"networkidle2",timeout:90000});
const data = await page.evaluate(()=>{
 const clean=(s)=>String(s||"").replace(/\s+/g," ").trim();
 const lines=(document.body?.innerText||"").split("\n").map(l=>l.trim()).filter(Boolean);
 const cards = Array.from(document.querySelectorAll('table, .ap-pprofile-stats, .ih-td-tab-sec, .vn-stats-on')).map(el=>clean(el.textContent).slice(0,800));
 const imgs = Array.from(document.querySelectorAll('img')).map(i=>i.getAttribute('src')||i.getAttribute('data-src')).filter(Boolean).slice(0,50);
 return {title:document.title, lines:lines.slice(0,260), cards:cards.slice(0,20), imgs};
});
console.log(JSON.stringify(data,null,2));
await browser.close();
