/* ─── Formula 1 2026 Season Static Data ─── */

export const F1_CONSTRUCTORS = [
  { id: "mer", name: "Mercedes-AMG Petronas", shortName: "MER", primaryColor: "#27F4D2", logoUrl: null },
  { id: "rbr", name: "Red Bull Racing", shortName: "RBR", primaryColor: "#3671C6", logoUrl: null },
  { id: "fer", name: "Scuderia Ferrari", shortName: "FER", primaryColor: "#E8002D", logoUrl: null },
  { id: "mcl", name: "McLaren F1 Team", shortName: "MCL", primaryColor: "#FF8000", logoUrl: null },
  { id: "ast", name: "Aston Martin", shortName: "AMR", primaryColor: "#229971", logoUrl: null },
  { id: "alp", name: "Alpine F1 Team", shortName: "ALP", primaryColor: "#0093CC", logoUrl: null },
  { id: "wil", name: "Williams Racing", shortName: "WIL", primaryColor: "#64C4FF", logoUrl: null },
  { id: "haa", name: "Haas F1 Team", shortName: "HAA", primaryColor: "#B6BABD", logoUrl: null },
  { id: "rb", name: "Racing Bulls", shortName: "RBS", primaryColor: "#6692FF", logoUrl: null },
  { id: "sau", name: "Stake F1 Team", shortName: "SAU", primaryColor: "#52E252", logoUrl: null },
];

export const F1_DRIVERS = [
  { id: "ant", name: "Kimi Antonelli", team: "mer", number: 12, country: "🇮🇹", points: 97, wins: 2, poles: 3, fastestLaps: 1, image: null },
  { id: "rus", name: "George Russell", team: "mer", number: 63, country: "🇬🇧", points: 82, wins: 1, poles: 2, fastestLaps: 2, image: null },
  { id: "nor", name: "Lando Norris", team: "mcl", number: 4, country: "🇬🇧", points: 78, wins: 2, poles: 1, fastestLaps: 1, image: null },
  { id: "pia", name: "Oscar Piastri", team: "mcl", number: 81, country: "🇦🇺", points: 72, wins: 1, poles: 1, fastestLaps: 0, image: null },
  { id: "lec", name: "Charles Leclerc", team: "fer", number: 16, country: "🇲🇨", points: 68, wins: 1, poles: 2, fastestLaps: 1, image: null },
  { id: "ham", name: "Lewis Hamilton", team: "fer", number: 44, country: "🇬🇧", points: 58, wins: 1, poles: 0, fastestLaps: 1, image: null },
  { id: "ver", name: "Max Verstappen", team: "ast", number: 1, country: "🇳🇱", points: 52, wins: 0, poles: 1, fastestLaps: 2, image: null },
  { id: "alo", name: "Fernando Alonso", team: "ast", number: 14, country: "🇪🇸", points: 38, wins: 0, poles: 0, fastestLaps: 0, image: null },
  { id: "gas", name: "Pierre Gasly", team: "alp", number: 10, country: "🇫🇷", points: 28, wins: 0, poles: 0, fastestLaps: 1, image: null },
  { id: "doo", name: "Jack Doohan", team: "alp", number: 7, country: "🇦🇺", points: 18, wins: 0, poles: 0, fastestLaps: 0, image: null },
  { id: "tsu", name: "Yuki Tsunoda", team: "rb", number: 22, country: "🇯🇵", points: 16, wins: 0, poles: 0, fastestLaps: 0, image: null },
  { id: "law", name: "Liam Lawson", team: "rbr", number: 30, country: "🇳🇿", points: 15, wins: 0, poles: 0, fastestLaps: 0, image: null },
  { id: "had", name: "Isack Hadjar", team: "rbr", number: 6, country: "🇫🇷", points: 12, wins: 0, poles: 0, fastestLaps: 0, image: null },
  { id: "alb", name: "Alex Albon", team: "wil", number: 23, country: "🇹🇭", points: 10, wins: 0, poles: 0, fastestLaps: 0, image: null },
  { id: "sai", name: "Carlos Sainz Jr.", team: "wil", number: 55, country: "🇪🇸", points: 8, wins: 0, poles: 0, fastestLaps: 0, image: null },
  { id: "ber", name: "Andrea Kimi Antonelli", team: "sau", number: 77, country: "🇩🇪", points: 4, wins: 0, poles: 0, fastestLaps: 0, image: null },
  { id: "bea", name: "Oliver Bearman", team: "haa", number: 87, country: "🇬🇧", points: 6, wins: 0, poles: 0, fastestLaps: 0, image: null },
  { id: "oco", name: "Esteban Ocon", team: "haa", number: 31, country: "🇫🇷", points: 5, wins: 0, poles: 0, fastestLaps: 0, image: null },
  { id: "bor", name: "Gabriel Bortoleto", team: "sau", number: 5, country: "🇧🇷", points: 3, wins: 0, poles: 0, fastestLaps: 0, image: null },
  { id: "iwa", name: "Ayumu Iwasa", team: "rb", number: 11, country: "🇯🇵", points: 2, wins: 0, poles: 0, fastestLaps: 0, image: null },
];

export const F1_CONSTRUCTOR_STANDINGS = [
  { team: "mer", points: 179, wins: 3 },
  { team: "mcl", points: 150, wins: 3 },
  { team: "fer", points: 126, wins: 2 },
  { team: "ast", points: 90, wins: 0 },
  { team: "alp", points: 46, wins: 0 },
  { team: "rbr", points: 27, wins: 0 },
  { team: "rb", points: 18, wins: 0 },
  { team: "wil", points: 18, wins: 0 },
  { team: "haa", points: 11, wins: 0 },
  { team: "sau", points: 7, wins: 0 },
];

export const F1_RACE_CALENDAR = [
  { id: "r1", name: "Australian GP", date: "Mar 16, 2026", circuit: "Albert Park, Melbourne", status: "completed" as const, winner: "Kimi Antonelli" },
  { id: "r2", name: "Chinese GP", date: "Mar 23, 2026", circuit: "Shanghai International", status: "completed" as const, winner: "Lando Norris" },
  { id: "r3", name: "Japanese GP", date: "Apr 6, 2026", circuit: "Suzuka", status: "completed" as const, winner: "Charles Leclerc" },
  { id: "r4", name: "Bahrain GP", date: "Apr 13, 2026", circuit: "Bahrain International", status: "completed" as const, winner: "Lewis Hamilton" },
  { id: "r5", name: "Miami GP", date: "May 3, 2026", circuit: "Miami International", status: "upcoming" as const },
  { id: "r6", name: "Emilia Romagna GP", date: "May 17, 2026", circuit: "Imola", status: "upcoming" as const },
  { id: "r7", name: "Monaco GP", date: "May 24, 2026", circuit: "Circuit de Monaco", status: "upcoming" as const },
  { id: "r8", name: "Spanish GP", date: "Jun 7, 2026", circuit: "Barcelona-Catalunya", status: "upcoming" as const },
  { id: "r9", name: "Canadian GP", date: "Jun 14, 2026", circuit: "Circuit Gilles Villeneuve", status: "upcoming" as const },
  { id: "r10", name: "Austrian GP", date: "Jun 28, 2026", circuit: "Red Bull Ring", status: "upcoming" as const },
];
