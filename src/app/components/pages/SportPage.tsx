import { motion } from "motion/react";
import { useNavigate, useParams } from "react-router";
import { Navbar } from "../ui/Navbar";
import { GlassCard } from "../ui/GlassCard";
import { BackButton } from "../ui/BackButton";
import { Breadcrumbs } from "../ui/Breadcrumbs";
import { Trophy, Users, ChevronRight, Calendar } from "lucide-react";

const sportData: Record<string, {
  name: string;
  icon: string;
  color: string;
  tournaments: {
    id: string;
    name: string;
    shortName: string;
    teams: number;
    status: string;
    season: string;
    logo: string;
    prize: string;
    country: string;
  }[];
}> = {
  cricket: {
    name: "Cricket",
    icon: "🏏",
    color: "#00E676",
    tournaments: [
      { id: "ipl", name: "Indian Premier League", shortName: "IPL 2026", teams: 10, status: "LIVE", season: "2026", logo: "🏆", prize: "₹50 Cr", country: "India" },
      { id: "wc", name: "ICC World Cup", shortName: "World Cup 2026", teams: 16, status: "Upcoming", season: "2026", logo: "🌍", prize: "$4M", country: "Global" },
      { id: "bbl", name: "Big Bash League", shortName: "BBL 2025", teams: 8, status: "Completed", season: "2025", logo: "🔥", prize: "AUD 2M", country: "Australia" },
      { id: "hundred", name: "The Hundred", shortName: "The Hundred 2026", teams: 8, status: "Upcoming", season: "2026", logo: "💯", prize: "£1.2M", country: "England" },
    ],
  },
  football: {
    name: "Football",
    icon: "⚽",
    color: "#3BD4E7",
    tournaments: [
      { id: "epl", name: "Premier League", shortName: "EPL 2025/26", teams: 20, status: "LIVE", season: "2025/26", logo: "🦁", prize: "£2.7B", country: "England" },
      { id: "ucl", name: "UEFA Champions League", shortName: "UCL 2025/26", teams: 32, status: "LIVE", season: "2025/26", logo: "⭐", prize: "€2.5B", country: "Europe" },
      { id: "laliga", name: "La Liga", shortName: "La Liga 2025/26", teams: 20, status: "LIVE", season: "2025/26", logo: "🌞", prize: "€2.1B", country: "Spain" },
      { id: "bundesliga", name: "Bundesliga", shortName: "Bundesliga 2025/26", teams: 18, status: "LIVE", season: "2025/26", logo: "🦅", prize: "€1.8B", country: "Germany" },
    ],
  },
  f1: {
    name: "Formula 1",
    icon: "🏎️",
    color: "#FF9100",
    tournaments: [
      { id: "f1-2026", name: "F1 World Championship", shortName: "F1 2026", teams: 10, status: "LIVE", season: "2026", logo: "🏁", prize: "$500M", country: "Global" },
      { id: "f2-2026", name: "Formula 2 Championship", shortName: "F2 2026", teams: 11, status: "LIVE", season: "2026", logo: "🏎️", prize: "$100M", country: "Global" },
    ],
  },
  basketball: {
    name: "Basketball",
    icon: "🏀",
    color: "#FF4D8D",
    tournaments: [
      { id: "nba", name: "NBA Finals 2026", shortName: "NBA 2025/26", teams: 30, status: "LIVE", season: "2025/26", logo: "🏀", prize: "$30M", country: "USA" },
      { id: "euroleague", name: "EuroLeague", shortName: "EuroLeague 2025/26", teams: 18, status: "LIVE", season: "2025/26", logo: "🌍", prize: "€50M", country: "Europe" },
    ],
  },
};

const statusColors: Record<string, { bg: string; border: string; text: string }> = {
  LIVE: { bg: "rgba(255,77,141,0.15)", border: "rgba(255,77,141,0.4)", text: "#FF4D8D" },
  Upcoming: { bg: "rgba(255,145,0,0.15)", border: "rgba(255,145,0,0.4)", text: "#FF9100" },
  Completed: { bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.1)", text: "rgba(255,255,255,0.4)" },
};

export function SportPage() {
  const navigate = useNavigate();
  const { sportId } = useParams<{ sportId: string }>();
  const data = sportData[sportId || "cricket"] || sportData.cricket;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen"
    >
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">

        {/* Navigation */}
        <div className="flex items-center justify-between mb-8">
          <BackButton to="/dashboard" />
          <Breadcrumbs items={[{ label: data.name }]} />
        </div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative overflow-hidden rounded-3xl p-8 mb-10"
          style={{
            background: `linear-gradient(135deg, ${data.color}12 0%, rgba(124,77,255,0.1) 100%)`,
            border: `1px solid ${data.color}20`,
          }}
        >
          <div className="flex items-center gap-6">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
              className="text-8xl"
            >
              {data.icon}
            </motion.div>
            <div>
              <p className="text-white/40 text-sm uppercase tracking-widest mb-2">Select Tournament</p>
              <h1 className="text-4xl font-black text-white mb-2">{data.name}</h1>
              <p className="text-white/50">{data.tournaments.length} tournaments available</p>
            </div>
          </div>
        </motion.div>

        {/* Tournaments Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {data.tournaments.map((tournament, i) => {
            const sc = statusColors[tournament.status] || statusColors.Completed;
            return (
              <motion.div
                key={tournament.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
              >
                <GlassCard
                  className="p-6 cursor-pointer group"
                  hover
                  onClick={() => navigate(`/sport/${sportId}/league/${tournament.id}`)}
                >
                  <div className="flex items-start justify-between mb-5">
                    <div className="flex items-center gap-4">
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
                        style={{ background: `${data.color}15`, border: `1px solid ${data.color}25` }}
                      >
                        {tournament.logo}
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-lg leading-tight">{tournament.name}</h3>
                        <p className="text-white/40 text-sm mt-0.5">{tournament.country} · {tournament.season}</p>
                      </div>
                    </div>
                    <div
                      className="px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5"
                      style={{ background: sc.bg, border: `1px solid ${sc.border}`, color: sc.text }}
                    >
                      {tournament.status === "LIVE" && (
                        <motion.div animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 1, repeat: Infinity }} className="w-1.5 h-1.5 rounded-full bg-[#FF4D8D]" />
                      )}
                      {tournament.status}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-5">
                    <div className="text-center p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
                      <Users size={16} className="mx-auto mb-1 text-white/30" />
                      <div className="text-white font-bold">{tournament.teams}</div>
                      <div className="text-white/30 text-xs">Teams</div>
                    </div>
                    <div className="text-center p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
                      <Calendar size={16} className="mx-auto mb-1 text-white/30" />
                      <div className="text-white font-bold text-sm">{tournament.season}</div>
                      <div className="text-white/30 text-xs">Season</div>
                    </div>
                    <div className="text-center p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
                      <Trophy size={16} className="mx-auto mb-1 text-white/30" />
                      <div className="text-white font-bold text-sm">{tournament.prize}</div>
                      <div className="text-white/30 text-xs">Prize</div>
                    </div>
                  </div>

                  <div
                    className="flex items-center justify-between pt-4"
                    style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
                  >
                    <span className="text-white/30 text-sm">{tournament.shortName}</span>
                    <div className="flex items-center gap-1 text-sm font-semibold group-hover:gap-2 transition-all" style={{ color: data.color }}>
                      <span>View League</span>
                      <ChevronRight size={16} />
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
