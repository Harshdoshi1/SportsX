# Quick Setup Instructions

## Step 1: Create Supabase Table

1. Open Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy and paste the entire content from `supabase_live_matches_table.sql`
6. Click **Run** or press `Ctrl+Enter`
7. Verify table created: Go to **Table Editor** → should see `admin_tracked_matches`

## Step 2: Verify Environment Variables

Check your `.env` file has Supabase credentials:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Step 3: Restart Backend

```bash
# Stop current backend (Ctrl+C)
cd backend
npm start
```

## Step 4: Test the System

### A. Login as Admin
1. Go to http://localhost:5173 (or your frontend URL)
2. Click **Login**
3. Enter:
   - Email: `admin@gmail.com`
   - Password: `Harshdoshi1$`
4. You should see **Add Live Match** and **Add Upcoming Match** buttons

### B. Add a Live Match
1. Click **Add Live Match** button
2. Fill in the form:
   - **URL**: `https://crex.com/cricket-live-score/gt-vs-rcb-34th-match-indian-premier-league-2026-match-updates-118F`
   - **Sport**: `Cricket`
   - **Section**: `IPL 2026`
   - **Title**: `GT vs RCB - Match 34`
3. Click **Submit**
4. You should see success message

### C. View Live Match
1. The match should appear in your dashboard
2. Click on the match
3. You should see:
   - ✅ Live scores with correct format
   - ✅ Current batsmen (2 players)
   - ✅ Current bowler (1 player)
   - ✅ Bowling: "3-45" format (wickets-runs)
   - ✅ Overs: "24.1" (separate)
   - ✅ Last 6 balls: [4] [1] [0] [W] [6] [2]
   - ✅ Live commentary
   - ✅ Full scorecard in sidebar
   - ✅ Auto-refresh every 3 seconds

## Step 5: Verify Admin Session Persistence

1. Navigate to different pages (Dashboard → Profile → Teams)
2. Come back to Dashboard
3. **Add Live Match** and **Add Upcoming Match** buttons should still be visible
4. No need to re-login

## Common Issues & Fixes

### Issue: 404 Error on `/api/admin/matches/live`
**Fix**: Restart backend server

### Issue: "Supabase not configured" error
**Fix**: 
1. Check `.env` file has all Supabase variables
2. Restart backend
3. Check Supabase dashboard → Settings → API for correct keys

### Issue: "Match yet to begin" or no data
**Fix**:
1. Verify the Crex URL is correct and accessible
2. Check backend console for scraping errors
3. Try a different match URL
4. Ensure Puppeteer is installed: `cd backend && npm install puppeteer`

### Issue: Admin buttons disappear after navigation
**Fix**: Already fixed! If still happening:
1. Clear browser localStorage
2. Re-login
3. Check browser console for errors

### Issue: Bowling shows "115-32" instead of "3-32"
**Fix**: Already fixed in new implementation! The format is now:
- Display: "3-32" (wickets-runs)
- Overs: "24.1" (separate line)

## Testing Different Matches

Try these Crex URLs:

1. **IPL Match**:
   ```
   https://crex.com/cricket-live-score/gt-vs-rcb-34th-match-indian-premier-league-2026-match-updates-118F
   ```

2. **International Match**:
   ```
   https://crex.com/cricket-live-score/oma-vs-uae-99th-match-mens-cwc-league-2-2023-27-match-updates-11HC
   ```

## Verification Checklist

- [ ] Supabase table `admin_tracked_matches` created
- [ ] Backend restarted successfully
- [ ] Can login as admin
- [ ] Add Live Match button visible
- [ ] Can add a match successfully
- [ ] Match appears in dashboard
- [ ] Match details show correct data format
- [ ] Bowling: "W-R" format (e.g., "3-45")
- [ ] Overs: Separate (e.g., "24.1")
- [ ] Last 6 balls showing real data
- [ ] Commentary showing real data
- [ ] Auto-refresh working (every 3s)
- [ ] Admin buttons persist after navigation

## Need Help?

Check these files for implementation details:
- `IMPLEMENTATION_SUMMARY.md` - Complete technical overview
- `backend/services/dynamicLiveMatchService.js` - Web scraping logic
- `src/app/components/pages/MatchDetailsNew.tsx` - UI implementation
- `supabase_live_matches_table.sql` - Database schema
