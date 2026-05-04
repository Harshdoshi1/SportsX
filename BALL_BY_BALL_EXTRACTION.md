# Ball-by-Ball Timeline Extraction

## What I Implemented

### 1. Ball-by-Ball Timeline Extraction
Extracts the actual ball-by-ball data from Crex's timeline display (like in your screenshot).

**Methods used**:
1. **DOM Element Search**: Looks for ball circles/badges with run values
2. **Timeline Structure**: Searches for specific timeline elements
3. **Text Parsing**: Parses from page text as fallback

**Example from your screenshot**:
```
Over 4: [6] [-12] [6] [1] [0] [4] [0]
Over 5: [0] [-11] [W]

Last 6 balls: [1] [0] [4] [0] [0] [W]
```

### 2. Current Bowler Extraction
Extracts the current bowler data directly from the page.

**Example from your screenshot**:
```
N Yadav
1-0 (0.1)

Extracted as:
{
  name: "N Yadav",
  wickets: 1,
  runs: 0,
  overs: "0.1"
}
```

### 3. Fallback System
If ball timeline not found in DOM:
- Falls back to commentary parsing
- Looks for keywords: FOUR, SIX, WICKET, etc.
- Extracts last 6 balls

## How It Works

### Ball Timeline Extraction
```javascript
// Step 1: Look for ball elements in DOM
const ballElements = document.querySelectorAll('[class*="ball"]');

// Step 2: Extract text content
for (const el of ballElements) {
  const text = el.textContent?.trim();
  if (text && /^[0-6WwNb]$/.test(text)) {
    balls.push(text.toUpperCase());
  }
}

// Step 3: Return last 6 balls
return balls.slice(-6);
```

### Current Bowler Extraction
```javascript
// Step 1: Look for bowler section
const bowlerSection = document.querySelector('[class*="current-bowler"]');

// Step 2: Extract name, figures, overs
const name = bowlerSection.querySelector('[class*="name"]')?.textContent;
const figures = bowlerSection.querySelector('[class*="figures"]')?.textContent;

// Step 3: Parse figures "1-0" into wickets and runs
const [wickets, runs] = figures.split('-').map(Number);

// Step 4: Return structured data
return {
  name: "N Yadav",
  wickets: 1,
  runs: 0,
  overs: "0.1"
};
```

## Testing

### Step 1: Restart Backend
```bash
cd C:\Users\harsh.doshi\Videos\SportsX
npm run dev
```

### Step 2: Check Backend Logs
When you view a match, you should see in the backend console:
```
📊 Ball timeline extracted: ['1', '0', '4', '0', '0', 'W']
🎯 Current bowler extracted: { name: 'N Yadav', wickets: 1, runs: 0, overs: '0.1' }
🎯 Final bowler: { name: 'N Yadav', wickets: 1, runs: 0, overs: '0.1' }
```

### Step 3: Check Frontend
In your match details page, you should see:
- **Last 6 Balls**: `[1] [0] [4] [0] [0] [W]` (real data)
- **Current Bowler**: "N Yadav 1-0, Overs: 0.1"

### Step 4: Verify API Response
Open browser console (F12) and check the API response:
```json
{
  "scoreboard": {
    "last6Balls": ["1", "0", "4", "0", "0", "W"],
    "bowlers": [{
      "name": "N Yadav",
      "wickets": 1,
      "runs": 0,
      "overs": "0.1"
    }]
  }
}
```

## Debugging

### If Last 6 Balls Still Shows Dummy Data

1. **Check Backend Logs**:
   ```
   📊 Ball timeline extracted: []
   ```
   If empty, the DOM extraction failed.

2. **Check Fallback**:
   The system should fall back to commentary parsing.
   Look for: `Fallback: extracting from commentary`

3. **Check Commentary**:
   If commentary is empty, no data can be extracted.

### If Current Bowler Shows "NO BOWLER ACTIVE"

1. **Check Backend Logs**:
   ```
   🎯 Current bowler extracted: null
   🎯 Final bowler: null
   ```
   If null, the extraction failed.

2. **Check Structured Data**:
   The system should fall back to structured data from embedded JSON.

3. **Manual Check**:
   Open the Crex URL in browser and check if bowler info is visible.

## Data Flow

```
1. User views match
   ↓
2. Frontend calls /api/admin/matches/:id
   ↓
3. Backend fetches URL from Supabase
   ↓
4. Backend opens Crex URL with Puppeteer
   ↓
5. Extract ball timeline from DOM
   ↓
6. Extract current bowler from DOM
   ↓
7. If not found, use structured data
   ↓
8. If still not found, parse from commentary
   ↓
9. Return to frontend
   ↓
10. Frontend displays real data
```

## Expected Results

### From Your Screenshot (NEP vs UAE)

**Match Info**:
- NEP: 289-7 (50.0 overs)
- UAE: 36-1 (4.1 overs)
- Status: Match stopped due to rain

**Current Players**:
- Batter 1: A Sharma - 21 (13)
- Batter 2: M Shahdad - 0 (0)
- Bowler: N Yadav - 1-0 (0.1)

**Ball Timeline**:
- Over 4: 6, -12, 6, 1, 0, 4, 0
- Over 5: 0, -11, W

**Last 6 Balls**: [1, 0, 4, 0, 0, W]

## Troubleshooting

### Issue: Empty Ball Timeline
**Cause**: Crex changed their HTML structure
**Fix**: Update the selectors in `extractBallByBallTimeline()`

### Issue: Bowler Not Found
**Cause**: Bowler section not in expected location
**Fix**: Update the selectors in `extractCurrentBowlerFromPage()`

### Issue: Wrong Ball Order
**Cause**: Balls extracted in wrong order
**Fix**: Check if `.slice(-6)` is getting the correct last 6 balls

## Files Modified

1. **backend/services/dynamicLiveMatchService.js**
   - Added `extractBallByBallTimeline()` function
   - Added `extractCurrentBowlerFromPage()` function
   - Updated main scraping logic to use these extractors
   - Added console logging for debugging

## Next Steps

1. Restart backend
2. View a live match
3. Check backend console for extraction logs
4. Verify frontend shows real data
5. If issues, check the debugging section above

## Success Indicators

✅ Backend logs show extracted ball timeline
✅ Backend logs show extracted current bowler
✅ Frontend shows real last 6 balls (not dummy)
✅ Frontend shows current bowler name and figures
✅ Overs in float format (e.g., "0.1", "2.0")
✅ No "NO BOWLER ACTIVE" message

**All data should be real from Crex, no dummy data!**
