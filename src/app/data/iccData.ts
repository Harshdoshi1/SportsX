/* ─── ICC World Cup 2026 Static Data ─── */

export const ICC_TEAMS = [
  { id: "ind", name: "India", shortName: "IND", primaryColor: "#0078D7", logoUrl: null },
  { id: "aus", name: "Australia", shortName: "AUS", primaryColor: "#FFD700", logoUrl: null },
  { id: "eng", name: "England", shortName: "ENG", primaryColor: "#CF142B", logoUrl: null },
  { id: "nz", name: "New Zealand", shortName: "NZ", primaryColor: "#000000", logoUrl: null },
  { id: "sa", name: "South Africa", shortName: "SA", primaryColor: "#007749", logoUrl: null },
  { id: "pak", name: "Pakistan", shortName: "PAK", primaryColor: "#01411C", logoUrl: null },
  { id: "wi", name: "West Indies", shortName: "WI", primaryColor: "#7B0041", logoUrl: null },
  { id: "sl", name: "Sri Lanka", shortName: "SL", primaryColor: "#1C3879", logoUrl: null },
  { id: "ban", name: "Bangladesh", shortName: "BAN", primaryColor: "#006A4E", logoUrl: null },
  { id: "afg", name: "Afghanistan", shortName: "AFG", primaryColor: "#009E49", logoUrl: null },
  { id: "zim", name: "Zimbabwe", shortName: "ZIM", primaryColor: "#006B3F", logoUrl: null },
  { id: "ire", name: "Ireland", shortName: "IRE", primaryColor: "#169B62", logoUrl: null },
  { id: "ned", name: "Netherlands", shortName: "NED", primaryColor: "#EF7C00", logoUrl: null },
  { id: "sco", name: "Scotland", shortName: "SCO", primaryColor: "#003082", logoUrl: null },
  { id: "nam", name: "Namibia", shortName: "NAM", primaryColor: "#003580", logoUrl: null },
  { id: "usa", name: "USA", shortName: "USA", primaryColor: "#B22234", logoUrl: null },
];

export const ICC_STANDINGS = [
  { team: "ind", played: 4, won: 4, lost: 0, drawn: 0, points: 8, nrr: "+2.14" },
  { team: "aus", played: 4, won: 3, lost: 1, drawn: 0, points: 6, nrr: "+1.52" },
  { team: "eng", played: 4, won: 3, lost: 1, drawn: 0, points: 6, nrr: "+0.89" },
  { team: "nz", played: 4, won: 2, lost: 2, drawn: 0, points: 4, nrr: "+0.33" },
  { team: "sa", played: 4, won: 2, lost: 2, drawn: 0, points: 4, nrr: "+0.12" },
  { team: "pak", played: 4, won: 2, lost: 2, drawn: 0, points: 4, nrr: "-0.21" },
  { team: "wi", played: 4, won: 1, lost: 3, drawn: 0, points: 2, nrr: "-0.67" },
  { team: "sl", played: 4, won: 1, lost: 3, drawn: 0, points: 2, nrr: "-0.89" },
  { team: "ban", played: 4, won: 1, lost: 3, drawn: 0, points: 2, nrr: "-1.02" },
  { team: "afg", played: 4, won: 0, lost: 4, drawn: 0, points: 0, nrr: "-2.21" },
];

const findTeam = (id: string) => ICC_TEAMS.find(t => t.id === id)!;

export const ICC_BATTING_LEADERS = [
  { player: "Virat Kohli", team: "ind", runs: 283, matches: 4, innings: 4, average: "70.75", strikeRate: "98.26", fifties: 2, hundreds: 1, image: null },
  { player: "Travis Head", team: "aus", runs: 246, matches: 4, innings: 4, average: "61.50", strikeRate: "112.33", fifties: 1, hundreds: 1, image: null },
  { player: "Joe Root", team: "eng", runs: 221, matches: 4, innings: 4, average: "55.25", strikeRate: "82.46", fifties: 2, hundreds: 0, image: null },
  { player: "Babar Azam", team: "pak", runs: 198, matches: 4, innings: 4, average: "49.50", strikeRate: "87.23", fifties: 2, hundreds: 0, image: null },
  { player: "Kane Williamson", team: "nz", runs: 187, matches: 4, innings: 4, average: "46.75", strikeRate: "78.57", fifties: 1, hundreds: 0, image: null },
  { player: "Aiden Markram", team: "sa", runs: 176, matches: 4, innings: 4, average: "44.00", strikeRate: "91.19", fifties: 1, hundreds: 0, image: null },
  { player: "Shubman Gill", team: "ind", runs: 168, matches: 4, innings: 4, average: "42.00", strikeRate: "89.36", fifties: 1, hundreds: 0, image: null },
  { player: "Marnus Labuschagne", team: "aus", runs: 153, matches: 4, innings: 4, average: "38.25", strikeRate: "76.50", fifties: 1, hundreds: 0, image: null },
  { player: "Daryl Mitchell", team: "nz", runs: 147, matches: 4, innings: 4, average: "36.75", strikeRate: "83.05", fifties: 1, hundreds: 0, image: null },
  { player: "Quinton de Kock", team: "sa", runs: 141, matches: 4, innings: 4, average: "35.25", strikeRate: "105.22", fifties: 0, hundreds: 1, image: null },
];

export const ICC_BOWLING_LEADERS = [
  { player: "Jasprit Bumrah", team: "ind", wickets: 13, matches: 4, overs: "36.0", runs: 98, economy: "2.72", average: "7.54", bbi: "5/21", image: null },
  { player: "Mitchell Starc", team: "aus", wickets: 11, matches: 4, overs: "34.2", runs: 121, economy: "3.52", average: "11.00", bbi: "4/33", image: null },
  { player: "Shaheen Afridi", team: "pak", wickets: 10, matches: 4, overs: "32.0", runs: 108, economy: "3.38", average: "10.80", bbi: "4/29", image: null },
  { player: "Trent Boult", team: "nz", wickets: 9, matches: 4, overs: "33.0", runs: 115, economy: "3.48", average: "12.78", bbi: "3/25", image: null },
  { player: "Mark Wood", team: "eng", wickets: 8, matches: 4, overs: "28.0", runs: 102, economy: "3.64", average: "12.75", bbi: "3/31", image: null },
  { player: "Kagiso Rabada", team: "sa", wickets: 8, matches: 4, overs: "30.0", runs: 99, economy: "3.30", average: "12.38", bbi: "3/22", image: null },
  { player: "Josh Hazlewood", team: "aus", wickets: 7, matches: 4, overs: "29.0", runs: 87, economy: "3.00", average: "12.43", bbi: "3/18", image: null },
  { player: "Rashid Khan", team: "afg", wickets: 7, matches: 4, overs: "32.0", runs: 94, economy: "2.94", average: "13.43", bbi: "4/28", image: null },
  { player: "Kuldeep Yadav", team: "ind", wickets: 6, matches: 4, overs: "28.0", runs: 86, economy: "3.07", average: "14.33", bbi: "3/19", image: null },
  { player: "Adil Rashid", team: "eng", wickets: 6, matches: 4, overs: "30.0", runs: 102, economy: "3.40", average: "17.00", bbi: "2/24", image: null },
];

export const ICC_FIXTURES = [
  { id: "icc-sf1", date: "Jul 8, 2026", home: "ind", away: "eng", venue: "Lord's, London", status: "upcoming" as const, matchLabel: "Semi-Final 1" },
  { id: "icc-sf2", date: "Jul 9, 2026", home: "aus", away: "nz", venue: "The Oval, London", status: "upcoming" as const, matchLabel: "Semi-Final 2" },
  { id: "icc-f", date: "Jul 13, 2026", home: "ind", away: "aus", venue: "Lord's, London", status: "upcoming" as const, matchLabel: "Final" },
];

export const ICC_RESULTS = [
  { id: "icc-r1", date: "Jun 20, 2026", home: "ind", away: "pak", homeScore: "301/5", awayScore: "278/9", venue: "The Oval, London", status: "completed" as const, result: "India won by 23 runs", matchLabel: "Group A" },
  { id: "icc-r2", date: "Jun 21, 2026", home: "aus", away: "eng", homeScore: "287/6", awayScore: "291/4", venue: "Lord's, London", status: "completed" as const, result: "England won by 6 wickets", matchLabel: "Group B" },
  { id: "icc-r3", date: "Jun 22, 2026", home: "nz", away: "sa", homeScore: "265/8", awayScore: "243/10", venue: "Edgbaston", status: "completed" as const, result: "New Zealand won by 22 runs", matchLabel: "Group A" },
];
