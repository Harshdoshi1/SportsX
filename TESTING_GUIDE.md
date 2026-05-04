# Testing Guide - Admin Live Match System

## Prerequisites

1. **Backend Running**: `npm run dev` (runs both frontend and backend)
2. **Supabase Configured**: Check `.env` has `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`
3. **Admin Credentials**: `admin@gmail.com` / `Harshdoshi1$`

## Step-by-Step Testing

### 1. Start the Application

```bash
cd C:\Users\harsh.doshi\Videos\SportsX
npm run dev
```

**Expected Output:**
```
> concurrently "npm run dev:client" "npm run dev:server"

[0] VITE v6.3.5  ready in XXX ms
[0] ➜  Local:   http://localhost:5173/
[1] Cricket backend is running on port 5000
```

### 2. Login as Admin

1. Open browser: `http://localhost:5173`
2. Click "Login" or navigate to `/login`
3. Enter credentials:
   - Email: `admin@gmail.com`
   - Password: `Harshdoshi1$`
4. Click "Login"

**Expected Result:**
- Redirects to `/admin/dashboard`
- Shows regular dashboard with 2 floating FAB buttons:
  - 🔴 "Add Live Match" (red/purple gradient)
  - 🟢 "Add Upcoming Match" (cyan/green gradient)

### 3. Add a Live Match

1. Click the **"Add Live Match"** button (red one)
2. Fill in the form:
   - **URL**: `https://crex.live/cricket/nepal-vs-uae-live-cricket-score-2nd-t20i-nepal-tour-of-uae-2025-1`
   - **Sport**: `Cricket`
   - **Section**: `International`
   - **Title**: `Nepal vs UAE - 2nd T20I`
3. Click "Add Match"

**Expected Result:**
- Modal closes
- Toast notification: "Live match added successfully"
- Match saved to Supabase `admin_tracked_matches` table

**Backend Console Should Show:**
```
POST /api/admin/matches/live 200
```

### 4. View the Live Match

1. Navigate to Dashboard (if not already there)
2. Find the match card for "Nepal vs UAE"
3. Click on the match card

**Expected Result:**
- Redirects to `/match/:matchId`
- Shows loading state briefly
- Then displays match details

**Backend Console Should Show:**
```
GET /api/admin/matches/:id 200
📊 Ball timeline extracted: ['1', '0', '4', '0', '0', 'W']
🎯 Current bowler extracted: { name: 'N Yadav', wickets: 1, runs: 0, overs: '0.1' }
🎯 Final bowler: { name: 'N Yadav', wickets: 1, runs: 0, overs: '0.1' }
```

### 5. Verify Match Details Page

Check the following sections:

#### A. Match Header
- ✅ Shows "LIVE" badge (red with Radio icon)
- ✅ Shows match title: "Nepal vs UAE - 2nd T20I"
- ✅ Shows venue
- ✅ Shows team logos
- ✅ Shows scores: "NEP 289-7" vs "UAE 36-1"
- ✅ Shows overs in float format: "50.0" and "4.1"
- ✅ Shows CRR and RRR

#### B. Live Window Section
**Current Players:**
- ✅ **Striker** (gradient background with ⚡):
  - Name: "A Sharma"
  - Score: "21 (13)"
  - Strike Rate: "161.5"
- ✅ **Non-Striker**:
  - Name: "M Shahdad"
  - Score: "0 (0)"
  - Strike Rate: "-"
- ✅ **Current Bowler** (gradient background with 🎯):
  - Name: "N Yadav"
  - Figures: "1-0"
  - Overs: "0.1"

**Live Stats:**
- ✅ CRR: Shows current run rate
- ✅ Req RR: Shows required run rate
- ✅ Partnership: Shows partnership runs and balls
- ✅ Last Wicket: Shows last wicket info

**Last 6 Balls:**
- ✅ Shows 6 circular badges
- ✅ Real data (not dummy): `[1] [0] [4] [0] [0] [W]`
- ✅ Color-coded:
  - Wicket (W): Red gradient with glow
  - Boundary (4,6): Blue gradient with glow
  - Regular (0-3): Gray
- ✅ Animated (scale effect)

#### C. Full Scorecard Section
- ✅ Shows batting lineup with runs, balls, SR
- ✅ Shows bowling figures with overs, wickets, runs
- ✅ Overs in float format: "2.0", "3.5", etc.

#### D. Commentary Tab
- ✅ Click "Commentary" tab
- ✅ Shows real commentary entries (not dummy)
- ✅ Each entry has:
  - Over number badge (e.g., "13.2")
  - Commentary text
- ✅ Hover effect on rows
- ✅ Animated slide-in effect

### 6. Verify Data Accuracy

#### Check Browser Console (F12)

1. Open DevTools (F12)
2. Go to Network tab
3. Find the request to `/api/admin/matches/:id`
4. Check the response:

```json
{
  "success": true,
  "data": {
    "match": {
      "id": "...",
      "title": "Nepal vs UAE - 2nd T20I",
      "team1": "NEP",
      "team2": "UAE",
      "team1Score": "289-7",
      "team2Score": "36-1",
      "team1Overs": "50.0",
      "team2Overs": "4.1",
      "status": "Live"
    },
    "scoreboard": {
      "batters": [
        { "name": "A Sharma", "runs": 21, "balls": 13 },
        { "name": "M Shahdad", "runs": 0, "balls": 0 }
      ],
      "bowlers": [
        { "name": "N Yadav", "wickets": 1, "runs": 0, "overs": "0.1" }
      ],
      "last6Balls": ["1", "0", "4", "0", "0", "W"],
      "commentary": [
        { "over": "4.1", "text": "WICKET! Caught behind" },
        { "over": "4.0", "text": "No run, dot ball" }
      ]
    }
  }
}
```

#### Check Backend Console

Should show:
```
📊 Ball timeline extracted: ['1', '0', '4', '0', '0', 'W']
🎯 Current bowler extracted: { name: 'N Yadav', wickets: 1, runs: 0, overs: '0.1' }
```

### 7. Test Auto-Refresh

The match details page auto-refreshes every 3 seconds.

**To Verify:**
1. Keep the match details page open
2. Watch the "Auto refresh 3s" badge
3. Check Network tab - should see requests every 3 seconds
4. Data should update automatically

### 8. Test Multiple Matches

1. Go back to dashboard
2. Add another live match with a different URL
3. Both matches should appear in dashboard
4. Click each match to verify data loads correctly

## Troubleshooting

### Issue: 404 Error on `/api/admin/matches/:id`

**Symptoms:**
```
Failed to load resource: the server responded with a status of 404 (Not Found)
```

**Causes:**
1. Backend not running
2. Match ID not in database
3. Route not registered

**Fix:**
```bash
# Restart backend
npm run dev

# Check backend console for:
Cricket backend is running on port 5000
```

### Issue: Empty Last 6 Balls

**Symptoms:**
- Shows "Waiting for ball data..."
- Backend logs: `📊 Ball timeline extracted: []`

**Causes:**
1. Crex changed their HTML structure
2. Ball elements not found in DOM
3. Commentary parsing failed

**Fix:**
1. Check backend logs for extraction attempts
2. Verify the Crex URL is accessible
3. May need to update DOM selectors in `extractBallByBallTimeline()`

### Issue: "NO BOWLER ACTIVE"

**Symptoms:**
- Current bowler section shows "No bowler active"
- Backend logs: `🎯 Current bowler extracted: null`

**Causes:**
1. Bowler section not found in DOM
2. Structured data doesn't have bowler info
3. Match hasn't started yet

**Fix:**
1. Check if match is actually live
2. Verify bowler info is visible on Crex page
3. May need to update DOM selectors in `extractCurrentBowlerFromPage()`

### Issue: Dummy Commentary

**Symptoms:**
- Commentary shows placeholder text
- Backend logs show empty commentary array

**Causes:**
1. Commentary section not found on page
2. Parsing regex not matching
3. Page structure changed

**Fix:**
1. Check backend logs for commentary parsing
2. Verify commentary is visible on Crex page
3. May need to update `parseCommentary()` function

### Issue: Wrong Overs Format

**Symptoms:**
- Shows "OVERS 2" instead of "2.0"

**Causes:**
1. Overs not being formatted as float
2. Old code still running

**Fix:**
1. Restart backend: `npm run dev`
2. Clear browser cache
3. Verify `parseScorecardBowling()` has float formatting

## Success Checklist

After testing, verify:

- [ ] Admin login works
- [ ] FAB buttons appear on admin dashboard
- [ ] Can add live match via modal
- [ ] Match saves to Supabase
- [ ] Match appears in dashboard
- [ ] Can click match to view details
- [ ] Match details page loads without errors
- [ ] Shows real team names and scores
- [ ] Shows real current batters
- [ ] Shows real current bowler (not "NO BOWLER ACTIVE")
- [ ] Shows real last 6 balls (not dummy data)
- [ ] Last 6 balls are color-coded and animated
- [ ] Overs in float format (e.g., "2.0")
- [ ] Commentary shows real text (not dummy)
- [ ] Commentary entries are animated
- [ ] Auto-refresh works (every 3 seconds)
- [ ] Full scorecard shows batting/bowling data
- [ ] UI has gradients and professional look
- [ ] No console errors

## Expected Final Result

### Match Details Page Should Look Like:

```
┌─────────────────────────────────────────────────────────┐
│ 🔴 LIVE    Nepal vs UAE - 2nd T20I    📍 Venue         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [NEP Logo]  NEP          VS          UAE  [UAE Logo]  │
│              289-7                    36-1              │
│              Overs: 50.0              Overs: 4.1        │
│                     CRR: 5.78                           │
│                     RRR: 8.45                           │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 🔥 Live Window                    Auto refresh 3s       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ⚡ Striker        Non Striker      🎯 Current Bowler   │
│  A Sharma         M Shahdad        N Yadav             │
│  21 (13)          0 (0)            1-0                 │
│  SR: 161.5        SR: -            Overs: 0.1          │
│                                                         │
│  CRR: 5.78  |  Req RR: 8.45  |  Partnership: 21(13)   │
│                                                         │
│  🏏 Last 6 Balls                    Live Updates        │
│  [1] [0] [4] [0] [0] [W]                               │
│  (animated, color-coded, with glow effects)            │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 💬 Live Commentary (12 entries)    Auto-updating       │
├─────────────────────────────────────────────────────────┤
│  4.1   WICKET! Caught behind, excellent delivery       │
│  4.0   No run, dot ball                                │
│  3.6   FOUR! Brilliant cover drive                     │
│  3.5   Single taken, quick running                     │
│  ...                                                    │
└─────────────────────────────────────────────────────────┘
```

## Performance Metrics

- **Page Load**: < 2 seconds
- **Data Fetch**: < 3 seconds (includes web scraping)
- **Auto-Refresh**: Every 3 seconds
- **Cache TTL**: 3 seconds (backend)
- **Scraping Time**: 2-4 seconds per match

## Next Steps After Testing

If everything works:
1. ✅ Mark Task 3 as complete
2. ✅ Move to next feature (if any)
3. ✅ Consider adding more sports
4. ✅ Consider adding match filters
5. ✅ Consider adding match search

If issues found:
1. Check backend logs for errors
2. Verify Crex URL is accessible
3. Update DOM selectors if needed
4. Test with different matches
5. Report specific errors for debugging
