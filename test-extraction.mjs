#!/usr/bin/env node

/**
 * Test Script for Ball-by-Ball and Bowler Extraction
 * 
 * Usage:
 *   node test-extraction.mjs <crex-url>
 * 
 * Example:
 *   node test-extraction.mjs https://crex.live/cricket/nepal-vs-uae-live-cricket-score-2nd-t20i-nepal-tour-of-uae-2025-1
 */

import puppeteer from 'puppeteer';

const url = process.argv[2];

if (!url) {
  console.error('❌ Error: Please provide a Crex URL');
  console.log('\nUsage:');
  console.log('  node test-extraction.mjs <crex-url>');
  console.log('\nExample:');
  console.log('  node test-extraction.mjs https://crex.live/cricket/nepal-vs-uae-live-cricket-score-2nd-t20i-nepal-tour-of-uae-2025-1');
  process.exit(1);
}

console.log('🚀 Starting extraction test...');
console.log('📍 URL:', url);
console.log('');

const extractBallTimeline = async (page) => {
  try {
    const ballData = await page.evaluate(() => {
      const balls = [];
      
      // Method 1: Look for ball circles/badges
      console.log('Method 1: Looking for ball elements...');
      const ballElements = document.querySelectorAll('[class*="ball"], [class*="run"], [class*="over-ball"]');
      console.log(`Found ${ballElements.length} potential ball elements`);
      
      for (const el of ballElements) {
        const text = el.textContent?.trim();
        if (text && /^[0-6WwNb]$/.test(text)) {
          balls.push(text.toUpperCase());
        }
      }
      
      // Method 2: Timeline structure
      if (balls.length === 0) {
        console.log('Method 2: Looking for timeline elements...');
        const timelineElements = document.querySelectorAll('.ball-timeline span, .over-summary span, [data-ball]');
        console.log(`Found ${timelineElements.length} timeline elements`);
        
        for (const el of timelineElements) {
          const text = el.textContent?.trim();
          if (text && /^[0-6WwNb]$/.test(text)) {
            balls.push(text.toUpperCase());
          }
        }
      }
      
      // Method 3: Parse from text
      if (balls.length === 0) {
        console.log('Method 3: Parsing from body text...');
        const bodyText = document.body.innerText;
        const overMatch = bodyText.match(/Over\s+\d+[:\s]+([0-6WwNb\s,]+)/gi);
        
        if (overMatch) {
          console.log(`Found ${overMatch.length} over matches`);
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
    
    return ballData;
  } catch (error) {
    console.error('❌ Error extracting ball timeline:', error);
    return [];
  }
};

const extractBowler = async (page) => {
  try {
    const bowlerData = await page.evaluate(() => {
      // Method 1: Look for bowler section
      console.log('Method 1: Looking for bowler section...');
      const bowlerSection = document.querySelector('[class*="current-bowler"], [class*="bowling-now"]');
      
      if (bowlerSection) {
        console.log('Found bowler section');
        const name = bowlerSection.querySelector('[class*="name"]')?.textContent?.trim();
        const figures = bowlerSection.querySelector('[class*="figures"]')?.textContent?.trim();
        const overs = bowlerSection.querySelector('[class*="overs"]')?.textContent?.trim();
        
        if (name) {
          return { name, figures, overs };
        }
      }
      
      // Method 2: Parse from text
      console.log('Method 2: Parsing from body text...');
      const bodyText = document.body.innerText;
      const bowlerMatch = bodyText.match(/([A-Z][A-Za-z\s.]+?)\s+(\d+-\d+)\s*\((\d+\.?\d*)\)/);
      
      if (bowlerMatch) {
        console.log('Found bowler in text');
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
    console.error('❌ Error extracting bowler:', error);
    return null;
  }
};

const parseCommentary = (text) => {
  const raw = String(text || "")
    .replace(/\s+/g, " ")
    .trim();

  const pieces = raw.split(/(?=\b\d{1,2}\.\d\b)/g);
  const rows = [];

  for (const piece of pieces) {
    const trimmed = String(piece || "").trim();
    const hit = trimmed.match(/^(\d{1,2}\.\d)\s+(.+)$/);
    if (!hit) continue;

    const over = hit[1];
    let textPart = String(hit[2] || "")
      .replace(/\s+/g, " ")
      .replace(/^[-:]+\s*/, "")
      .trim();

    textPart = textPart.replace(/^(to\s+[A-Za-z\s]+,?\s*)/i, "");
    
    if (!textPart || textPart.length < 4) continue;
    rows.push({ over, text: textPart.slice(0, 300) });
  }

  return rows.slice(0, 10); // First 10 for testing
};

(async () => {
  let browser;
  
  try {
    console.log('🌐 Launching browser...');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    
    const page = await browser.newPage();
    
    console.log('⚙️  Configuring page...');
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    );
    await page.setViewport({ width: 1366, height: 900 });
    
    console.log('📥 Loading page...');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('✅ Page loaded\n');
    
    // Extract page text
    const pageText = await page.evaluate(() => document.body.innerText);
    
    // Test ball timeline extraction
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🏏 BALL TIMELINE EXTRACTION');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const balls = await extractBallTimeline(page);
    console.log('\n📊 Extracted balls:', balls);
    console.log('📊 Last 6 balls:', balls.slice(-6));
    console.log('📊 Total balls found:', balls.length);
    
    // Test bowler extraction
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 CURRENT BOWLER EXTRACTION');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const bowler = await extractBowler(page);
    console.log('\n🎯 Extracted bowler:', bowler);
    
    // Test commentary parsing
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💬 COMMENTARY PARSING');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const commentary = parseCommentary(pageText);
    console.log('\n💬 Parsed commentary entries:', commentary.length);
    if (commentary.length > 0) {
      console.log('\n📝 First 5 entries:');
      commentary.slice(0, 5).forEach((entry, i) => {
        console.log(`  ${i + 1}. ${entry.over} - ${entry.text.slice(0, 80)}${entry.text.length > 80 ? '...' : ''}`);
      });
    }
    
    // Summary
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Balls extracted: ${balls.length > 0 ? 'YES' : 'NO'} (${balls.length} balls)`);
    console.log(`✅ Last 6 balls: ${balls.slice(-6).join(', ') || 'NONE'}`);
    console.log(`✅ Bowler extracted: ${bowler ? 'YES' : 'NO'}`);
    if (bowler) {
      console.log(`   Name: ${bowler.name}`);
      console.log(`   Figures: ${bowler.wickets}-${bowler.runs}`);
      console.log(`   Overs: ${bowler.overs}`);
    }
    console.log(`✅ Commentary parsed: ${commentary.length > 0 ? 'YES' : 'NO'} (${commentary.length} entries)`);
    
    console.log('\n✅ Test complete!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
})();
