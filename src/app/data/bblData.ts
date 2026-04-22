/* ─── Big Bash League 2025 Static Data ─── */

export const BBL_TEAMS = [
  { id: "ss", name: "Sydney Sixers", shortName: "SIX", primaryColor: "#FF1E8C", logoUrl: null },
  { id: "ms", name: "Melbourne Stars", shortName: "STA", primaryColor: "#00B140", logoUrl: null },
  { id: "st", name: "Sydney Thunder", shortName: "THU", primaryColor: "#00E100", logoUrl: null },
  { id: "ps", name: "Perth Scorchers", shortName: "SCO", primaryColor: "#FF6600", logoUrl: null },
  { id: "bh", name: "Brisbane Heat", shortName: "HEA", primaryColor: "#00B7EB", logoUrl: null },
  { id: "mr", name: "Melbourne Renegades", shortName: "REN", primaryColor: "#CC0000", logoUrl: null },
  { id: "as", name: "Adelaide Strikers", shortName: "STR", primaryColor: "#009FDF", logoUrl: null },
  { id: "hh", name: "Hobart Hurricanes", shortName: "HUR", primaryColor: "#6F2DA8", logoUrl: null },
];

export const BBL_STANDINGS = [
  { team: "ps", played: 14, won: 10, lost: 4, points: 20, nrr: "+0.92" },
  { team: "ss", played: 14, won: 9, lost: 5, points: 18, nrr: "+0.71" },
  { team: "bh", played: 14, won: 8, lost: 6, points: 16, nrr: "+0.34" },
  { team: "hh", played: 14, won: 7, lost: 7, points: 14, nrr: "+0.12" },
  { team: "ms", played: 14, won: 6, lost: 8, points: 12, nrr: "-0.23" },
  { team: "as", played: 14, won: 5, lost: 9, points: 10, nrr: "-0.45" },
  { team: "st", played: 14, won: 5, lost: 9, points: 10, nrr: "-0.56" },
  { team: "mr", played: 14, won: 4, lost: 10, points: 8, nrr: "-0.85" },
];

export const BBL_BATTING_LEADERS = [
  { player: "Josh Philippe", team: "ss", runs: 432, matches: 14, strikeRate: "148.28", average: "33.23", image: null },
  { player: "Glenn Maxwell", team: "ms", runs: 398, matches: 14, strikeRate: "162.45", average: "30.62", image: null },
  { player: "Aaron Hardie", team: "ps", runs: 376, matches: 14, strikeRate: "139.26", average: "28.92", image: null },
  { player: "Ben McDermott", team: "hh", runs: 362, matches: 14, strikeRate: "135.82", average: "27.85", image: null },
  { player: "Marcus Stoinis", team: "ms", runs: 348, matches: 14, strikeRate: "142.62", average: "26.77", image: null },
  { player: "Alex Hales", team: "st", runs: 334, matches: 14, strikeRate: "152.51", average: "25.69", image: null },
  { player: "Sam Billings", team: "bh", runs: 321, matches: 14, strikeRate: "131.15", average: "24.69", image: null },
  { player: "Mitchell Marsh", team: "ps", runs: 308, matches: 14, strikeRate: "155.56", average: "23.69", image: null },
  { player: "Matt Short", team: "as", runs: 295, matches: 14, strikeRate: "144.12", average: "22.69", image: null },
  { player: "Jason Sangha", team: "st", runs: 283, matches: 14, strikeRate: "128.64", average: "21.77", image: null },
];

export const BBL_BOWLING_LEADERS = [
  { player: "Spencer Johnson", team: "bh", wickets: 21, matches: 14, economy: "7.82", average: "16.14", bbi: "4/18", image: null },
  { player: "Adam Zampa", team: "ms", wickets: 19, matches: 14, economy: "7.12", average: "17.89", bbi: "3/22", image: null },
  { player: "Jhye Richardson", team: "ps", wickets: 18, matches: 14, economy: "7.95", average: "18.33", bbi: "3/25", image: null },
  { player: "Tom Rogers", team: "hh", wickets: 16, matches: 14, economy: "8.21", average: "20.25", bbi: "3/19", image: null },
  { player: "Sean Abbott", team: "ss", wickets: 15, matches: 14, economy: "8.05", average: "21.47", bbi: "4/28", image: null },
  { player: "Mark Steketee", team: "bh", wickets: 14, matches: 14, economy: "8.42", average: "22.57", bbi: "3/31", image: null },
  { player: "Nathan Ellis", team: "hh", wickets: 13, matches: 14, economy: "7.68", average: "23.85", bbi: "3/20", image: null },
  { player: "Andrew Tye", team: "ps", wickets: 13, matches: 14, economy: "8.91", average: "24.15", bbi: "2/24", image: null },
  { player: "Wes Agar", team: "as", wickets: 12, matches: 14, economy: "8.33", average: "25.67", bbi: "3/27", image: null },
  { player: "Henry Thornton", team: "mr", wickets: 11, matches: 14, economy: "8.55", average: "27.09", bbi: "2/22", image: null },
];
