/* ─── NBA 2025-26 Season Static Data ─── */

export const NBA_TEAMS = [
  { id: "bos", name: "Boston Celtics", shortName: "BOS", primaryColor: "#007A33", logoUrl: null },
  { id: "okc", name: "Oklahoma City Thunder", shortName: "OKC", primaryColor: "#007AC1", logoUrl: null },
  { id: "cle", name: "Cleveland Cavaliers", shortName: "CLE", primaryColor: "#860038", logoUrl: null },
  { id: "nyk", name: "New York Knicks", shortName: "NYK", primaryColor: "#006BB6", logoUrl: null },
  { id: "den", name: "Denver Nuggets", shortName: "DEN", primaryColor: "#0E2240", logoUrl: null },
  { id: "mil", name: "Milwaukee Bucks", shortName: "MIL", primaryColor: "#00471B", logoUrl: null },
  { id: "dal", name: "Dallas Mavericks", shortName: "DAL", primaryColor: "#00538C", logoUrl: null },
  { id: "phx", name: "Phoenix Suns", shortName: "PHX", primaryColor: "#1D1160", logoUrl: null },
  { id: "min", name: "Minnesota Timberwolves", shortName: "MIN", primaryColor: "#0C2340", logoUrl: null },
  { id: "lal", name: "Los Angeles Lakers", shortName: "LAL", primaryColor: "#552583", logoUrl: null },
  { id: "gsw", name: "Golden State Warriors", shortName: "GSW", primaryColor: "#1D428A", logoUrl: null },
  { id: "mem", name: "Memphis Grizzlies", shortName: "MEM", primaryColor: "#5D76A9", logoUrl: null },
  { id: "mia", name: "Miami Heat", shortName: "MIA", primaryColor: "#98002E", logoUrl: null },
  { id: "sac", name: "Sacramento Kings", shortName: "SAC", primaryColor: "#5A2D81", logoUrl: null },
  { id: "phi", name: "Philadelphia 76ers", shortName: "PHI", primaryColor: "#006BB6", logoUrl: null },
  { id: "ind", name: "Indiana Pacers", shortName: "IND", primaryColor: "#002D62", logoUrl: null },
  { id: "lac", name: "LA Clippers", shortName: "LAC", primaryColor: "#C8102E", logoUrl: null },
  { id: "hou", name: "Houston Rockets", shortName: "HOU", primaryColor: "#CE1141", logoUrl: null },
  { id: "atl", name: "Atlanta Hawks", shortName: "ATL", primaryColor: "#E03A3E", logoUrl: null },
  { id: "chi", name: "Chicago Bulls", shortName: "CHI", primaryColor: "#CE1141", logoUrl: null },
  { id: "tor", name: "Toronto Raptors", shortName: "TOR", primaryColor: "#CE1141", logoUrl: null },
  { id: "orl", name: "Orlando Magic", shortName: "ORL", primaryColor: "#0077C0", logoUrl: null },
  { id: "cha", name: "Charlotte Hornets", shortName: "CHA", primaryColor: "#1D1160", logoUrl: null },
  { id: "por", name: "Portland Trail Blazers", shortName: "POR", primaryColor: "#E03A3E", logoUrl: null },
  { id: "nop", name: "New Orleans Pelicans", shortName: "NOP", primaryColor: "#0C2340", logoUrl: null },
  { id: "det", name: "Detroit Pistons", shortName: "DET", primaryColor: "#C8102E", logoUrl: null },
  { id: "sas", name: "San Antonio Spurs", shortName: "SAS", primaryColor: "#C4CED4", logoUrl: null },
  { id: "uta", name: "Utah Jazz", shortName: "UTA", primaryColor: "#002B5C", logoUrl: null },
  { id: "bkn", name: "Brooklyn Nets", shortName: "BKN", primaryColor: "#000000", logoUrl: null },
  { id: "wsh", name: "Washington Wizards", shortName: "WAS", primaryColor: "#002B5C", logoUrl: null },
];

export const NBA_STANDINGS = [
  { team: "bos", played: 72, won: 56, lost: 16, points: 0, winPct: ".778" },
  { team: "okc", played: 72, won: 55, lost: 17, points: 0, winPct: ".764" },
  { team: "cle", played: 72, won: 53, lost: 19, points: 0, winPct: ".736" },
  { team: "nyk", played: 72, won: 48, lost: 24, points: 0, winPct: ".667" },
  { team: "den", played: 72, won: 47, lost: 25, points: 0, winPct: ".653" },
  { team: "mil", played: 72, won: 46, lost: 26, points: 0, winPct: ".639" },
  { team: "dal", played: 72, won: 45, lost: 27, points: 0, winPct: ".625" },
  { team: "phx", played: 72, won: 44, lost: 28, points: 0, winPct: ".611" },
  { team: "min", played: 72, won: 43, lost: 29, points: 0, winPct: ".597" },
  { team: "lal", played: 72, won: 42, lost: 30, points: 0, winPct: ".583" },
];

export const NBA_PPG_LEADERS = [
  { player: "Luka Doncic", team: "dal", ppg: 33.8, rpg: 9.2, apg: 9.8, image: null },
  { player: "Shai Gilgeous-Alexander", team: "okc", ppg: 32.1, rpg: 5.5, apg: 6.2, image: null },
  { player: "Jayson Tatum", team: "bos", ppg: 28.4, rpg: 8.1, apg: 4.7, image: null },
  { player: "Giannis Antetokounmpo", team: "mil", ppg: 31.2, rpg: 11.8, apg: 5.8, image: null },
  { player: "Joel Embiid", team: "phi", ppg: 29.7, rpg: 10.9, apg: 3.2, image: null },
  { player: "Kevin Durant", team: "phx", ppg: 27.3, rpg: 6.8, apg: 5.1, image: null },
  { player: "Anthony Davis", team: "lal", ppg: 26.8, rpg: 12.1, apg: 3.5, image: null },
  { player: "Nikola Jokic", team: "den", ppg: 26.4, rpg: 12.4, apg: 9.1, image: null },
  { player: "Donovan Mitchell", team: "cle", ppg: 25.9, rpg: 4.5, apg: 5.3, image: null },
  { player: "Anthony Edwards", team: "min", ppg: 25.7, rpg: 5.4, apg: 5.1, image: null },
];

export const NBA_RPG_LEADERS = [
  { player: "Nikola Jokic", team: "den", rpg: 12.4, ppg: 26.4, apg: 9.1, image: null },
  { player: "Anthony Davis", team: "lal", rpg: 12.1, ppg: 26.8, apg: 3.5, image: null },
  { player: "Giannis Antetokounmpo", team: "mil", rpg: 11.8, ppg: 31.2, apg: 5.8, image: null },
  { player: "Joel Embiid", team: "phi", rpg: 10.9, ppg: 29.7, apg: 3.2, image: null },
  { player: "Domantas Sabonis", team: "sac", rpg: 10.5, ppg: 21.2, apg: 7.8, image: null },
  { player: "Luka Doncic", team: "dal", rpg: 9.2, ppg: 33.8, apg: 9.8, image: null },
  { player: "Victor Wembanyama", team: "sas", rpg: 9.1, ppg: 22.8, apg: 3.7, image: null },
  { player: "Jayson Tatum", team: "bos", rpg: 8.1, ppg: 28.4, apg: 4.7, image: null },
  { player: "Chet Holmgren", team: "okc", rpg: 7.9, ppg: 16.8, apg: 2.4, image: null },
  { player: "Bam Adebayo", team: "mia", rpg: 7.8, ppg: 19.2, apg: 4.1, image: null },
];

export const NBA_APG_LEADERS = [
  { player: "Luka Doncic", team: "dal", apg: 9.8, ppg: 33.8, rpg: 9.2, image: null },
  { player: "Nikola Jokic", team: "den", apg: 9.1, ppg: 26.4, rpg: 12.4, image: null },
  { player: "Tyrese Haliburton", team: "ind", apg: 8.5, ppg: 20.1, rpg: 3.9, image: null },
  { player: "Domantas Sabonis", team: "sac", apg: 7.8, ppg: 21.2, rpg: 10.5, image: null },
  { player: "Trae Young", team: "atl", apg: 7.4, ppg: 23.4, rpg: 3.1, image: null },
  { player: "LaMelo Ball", team: "cha", apg: 7.2, ppg: 24.1, rpg: 5.3, image: null },
  { player: "Shai Gilgeous-Alexander", team: "okc", apg: 6.2, ppg: 32.1, rpg: 5.5, image: null },
  { player: "Giannis Antetokounmpo", team: "mil", apg: 5.8, ppg: 31.2, rpg: 11.8, image: null },
  { player: "Jalen Brunson", team: "nyk", apg: 5.7, ppg: 24.8, rpg: 3.6, image: null },
  { player: "Donovan Mitchell", team: "cle", apg: 5.3, ppg: 25.9, rpg: 4.5, image: null },
];

export const NBA_BLK_LEADERS = [
  { player: "Victor Wembanyama", team: "sas", bpg: 3.6, ppg: 22.8, rpg: 9.1, image: null },
  { player: "Chet Holmgren", team: "okc", bpg: 2.8, ppg: 16.8, rpg: 7.9, image: null },
  { player: "Anthony Davis", team: "lal", bpg: 2.3, ppg: 26.8, rpg: 12.1, image: null },
  { player: "Myles Turner", team: "ind", bpg: 2.1, ppg: 17.1, rpg: 6.8, image: null },
  { player: "Brook Lopez", team: "mil", bpg: 1.9, ppg: 12.5, rpg: 5.2, image: null },
  { player: "Walker Kessler", team: "uta", bpg: 1.8, ppg: 8.4, rpg: 7.4, image: null },
  { player: "Joel Embiid", team: "phi", bpg: 1.7, ppg: 29.7, rpg: 10.9, image: null },
  { player: "Giannis Antetokounmpo", team: "mil", bpg: 1.5, ppg: 31.2, rpg: 11.8, image: null },
  { player: "Bam Adebayo", team: "mia", bpg: 1.4, ppg: 19.2, rpg: 7.8, image: null },
  { player: "Evan Mobley", team: "cle", bpg: 1.3, ppg: 18.3, rpg: 8.2, image: null },
];
