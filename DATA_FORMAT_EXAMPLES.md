# Data Format Examples

## ❌ WRONG Format (Before Fix)

### Bowling Display
```
Current Bowler
J Bumrah
115-32 (4.1)    ← WRONG! Shows all digits together
```
**Problem**: "115-32" looks like wickets-runs but it's actually "1 wicket, 15 runs, 32 overs"

### Last 6 Balls
```
[D] [U] [M] [M] [Y] [!]    ← WRONG! Dummy data
```

---

## ✅ CORRECT Format (After Fix)

### Bowling Display
```
Current Bowler
J Bumrah
1-15          ← Wickets-Runs (large, prominent)
Overs: 3.2    ← Overs (small, separate line)
```

### Batting Display
```
Striker                Non Striker
V Kohli                R Sharma
67 (45)                34 (28)
SR: 148.9              SR: 121.4
```

### Last 6 Balls (Real Data from Commentary)
```
[4] [1] [0] [W] [6] [2]
```
- Blue: 4, 6 (boundaries)
- Red: W (wicket)
- Gray: 0, 1, 2, 3 (regular runs)

---

## API Response Format

### GET /api/admin/matches/:id

```json
{
  "success": true,
  "data": {
    "match": {
      "id": "118F",
      "title": "GT vs RCB - Match 34",
      "sport": "cricket",
      "team1": "GT",
      "team2": "RCB",
      "team1Score": "167/4",
      "team2Score": "142/7",
      "team1Overs": "20.0",
      "team2Overs": "16.3",
      "status": "Live",
      "venue": "Narendra Modi Stadium, Ahmedabad"
    },
    "scoreboard": {
      "batters": [
        {
          "name": "V Kohli",
          "runs": 67,
          "balls": 45
        },
        {
          "name": "R Sharma",
          "runs": 34,
          "balls": 28
        }
      ],
      "bowlers": [
        {
          "name": "J Bumrah",
          "wickets": 1,
          "runs": 15,
          "overs": "3.2"
        }
      ],
      "last6Balls": ["4", "1", "0", "W", "6", "2"],
      "commentary": [
        {
          "over": "16.3",
          "text": "FOUR! Kohli drives through covers for a boundary"
        },
        {
          "over": "16.2",
          "text": "Single taken, Sharma on strike now"
        }
      ],
      "liveStats": {
        "currentRunRate": "8.45",
        "requiredRunRate": "12.30",
        "partnership": "45(32)"
      },
      "fullScorecard": {
        "team1": {
          "batters": [
            {
              "name": "V Kohli",
              "runs": 67,
              "balls": 45,
              "fours": 8,
              "sixes": 2,
              "strikeRate": 148.9
            }
          ],
          "bowlers": [
            {
              "name": "J Bumrah",
              "overs": "3.2",
              "maidens": 0,
              "runs": 15,
              "wickets": 1,
              "economy": 4.5
            }
          ]
        }
      }
    }
  }
}
```

---

## UI Display Mapping

### Current Players Section
```
┌─────────────────────────────────────────────────────────┐
│ Striker          Non Striker       Current Bowler       │
│ V Kohli          R Sharma          J Bumrah             │
│ 67 (45)          34 (28)           1-15                 │
│ SR: 148.9        SR: 121.4         Overs: 3.2           │
└─────────────────────────────────────────────────────────┘
```

### Live Stats Section
```
┌─────────────────────────────────────────────────────────┐
│ CRR      Req RR    Partnership    Last Wicket           │
│ 8.45     12.30     45(32)         Kohli 67(45)          │
└─────────────────────────────────────────────────────────┘
```

### Last 6 Balls Section
```
┌─────────────────────────────────────────────────────────┐
│ Last 6 Balls                                            │
│ [4] [1] [0] [W] [6] [2]                                 │
└─────────────────────────────────────────────────────────┘
```

### Full Scorecard Section
```
┌─────────────────────────────────────────────────────────┐
│ GT Batting                                              │
│ V Kohli                                    67(45)       │
│ R Sharma                                   34(28)       │
│ S Gill                                     23(18)       │
│                                                         │
│ RCB Bowling                                             │
│ J Bumrah                                   1-15 (3.2)   │
│ M Siraj                                    2-28 (4.0)   │
└─────────────────────────────────────────────────────────┘
```

---

## Data Extraction Logic

### Bowling Figures Parsing
```javascript
// Input from scraper: "1-15" or "115" (malformed)
// Correct parsing:
const bowler = {
  name: "J Bumrah",
  wickets: 1,      // First digit(s) before dash
  runs: 15,        // Digits after dash
  overs: "3.2"     // Separate field
};

// Display:
// Large: "1-15" (wickets-runs)
// Small: "Overs: 3.2"
```

### Last 6 Balls Extraction
```javascript
// From commentary text:
"16.3 - FOUR! Kohli drives through covers"
"16.2 - Single taken"
"16.1 - No run"
"15.6 - WICKET! Sharma caught behind"
"15.5 - SIX! Massive hit over long-on"
"15.4 - Two runs taken"

// Extracted:
["4", "1", "0", "W", "6", "2"]
```

### Strike Rate Calculation
```javascript
const strikeRate = (runs / balls) * 100;
// Example: (67 / 45) * 100 = 148.9
```

---

## Comparison: Old vs New

| Feature | Old (Wrong) | New (Correct) |
|---------|-------------|---------------|
| Bowling Format | "115-32 (4.1)" | "1-15" + "Overs: 3.2" |
| Batters Shown | All 4-6 batters | Only 2 current |
| Bowlers Shown | All 4-6 bowlers | Only 1 current |
| Last 6 Balls | Dummy data | Real from commentary |
| Strike Rate | Not shown | Calculated and shown |
| Full Scorecard | Not available | Fetched from /match-scorecard |
| Commentary | Limited | Up to 30 recent entries |
| Refresh Rate | 2 seconds | 3 seconds (optimized) |
| Data Source | Static config | Dynamic from Supabase |

---

## Testing the Format

### Test Case 1: Bowling Display
**Input**: Bowler has 3 wickets, 45 runs, 24.1 overs
**Expected Display**:
```
Current Bowler
J Bumrah
3-45          ← Large, prominent
Overs: 24.1   ← Small, below
```

### Test Case 2: Last 6 Balls
**Input**: Commentary shows "FOUR", "Single", "No run", "WICKET", "SIX", "Two runs"
**Expected Display**:
```
[4] [1] [0] [W] [6] [2]
```
With colors: Blue for 4,6 | Red for W | Gray for 0,1,2

### Test Case 3: Current Batters
**Input**: 6 batters in scorecard, 2 currently batting
**Expected Display**: Only show the 2 current batters, not all 6

---

## Validation Rules

✅ **Wickets**: Must be single digit (0-10)
✅ **Runs**: Can be any number (0-999)
✅ **Overs**: Format "XX.X" (e.g., "24.1", "3.2")
✅ **Last 6 Balls**: Only values: 0, 1, 2, 3, 4, 6, W
✅ **Strike Rate**: Calculated as (runs/balls)*100, shown with 1 decimal
✅ **Current Players**: Maximum 2 batters, 1 bowler

---

This format ensures professional, accurate display like Cricbuzz, ESPN, and Crex!
