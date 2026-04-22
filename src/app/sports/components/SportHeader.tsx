import { motion } from "motion/react";
import type { SportPageData } from "../sportTypes";

interface SportHeaderProps {
  data: SportPageData;
  teamCount?: number;
  playerCount?: number;
}

export function SportHeader({ data, teamCount, playerCount }: SportHeaderProps) {
  const totalPlayers = playerCount || data.featuredLeaderboards.reduce((acc, lb) => Math.max(acc, lb.rows.length), 0);
  const fixtureCount = (data.fixtures?.length || 0) + (data.results?.length || 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="relative overflow-hidden rounded-3xl p-8 mb-8"
      style={{
        background: `linear-gradient(140deg, ${data.sportColor}15 0%, rgba(124,77,255,0.12) 50%, rgba(13,26,50,0.9) 100%)`,
        border: `1px solid ${data.sportColor}20`,
      }}
    >
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-center">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl">{data.sportIcon}</span>
            <p className="text-white/35 text-xs uppercase tracking-widest">{data.sport.toUpperCase()}</p>
          </div>
          <h1 className="text-4xl font-black text-white mb-2">{data.leagueName}</h1>
          {data.seasonLabel && <p className="text-white/55 text-sm">Season {data.seasonLabel}</p>}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            [String(teamCount || data.teams.length), "Teams"],
            [String(totalPlayers), "Players"],
            [String(fixtureCount), "Matches"],
          ].map(([v, l]) => (
            <div key={l} className="p-3 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="text-2xl font-black text-white">{v}</div>
              <div className="text-xs text-white/30">{l}</div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
