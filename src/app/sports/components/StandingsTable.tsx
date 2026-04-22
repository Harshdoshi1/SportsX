import { motion } from "motion/react";
import type { TeamStandingRow } from "../sportTypes";
import { TeamRefLogo } from "./TeamRefLogo";
import { GlassCard } from "../../components/ui/GlassCard";

interface StandingsTableProps {
  standings: TeamStandingRow[];
  title?: string;
  sportColor?: string;
}

export function StandingsTable({ standings, title = "Standings", sportColor = "#3BD4E7" }: StandingsTableProps) {
  if (standings.length === 0) return null;

  const additionalKeys = standings[0]?.additional ? Object.keys(standings[0].additional) : [];

  return (
    <GlassCard className="overflow-hidden">
      <div className="px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <h3 className="text-white font-bold">{title}</h3>
      </div>

      {/* Column headers */}
      <div
        className="grid gap-2 px-6 py-3 text-xs uppercase tracking-wider text-white/30 font-semibold"
        style={{
          gridTemplateColumns: `2.5fr 0.6fr 0.6fr 0.6fr 0.7fr ${additionalKeys.map(() => "0.8fr").join(" ")}`,
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <span>Team</span>
        <span className="text-center">P</span>
        <span className="text-center">W</span>
        <span className="text-center">L</span>
        <span className="text-center">Pts</span>
        {additionalKeys.map((k) => (
          <span key={k} className="text-center hidden md:block">{k}</span>
        ))}
      </div>

      {/* Rows */}
      {standings.map((row, idx) => (
        <motion.div
          key={row.team.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.03 }}
          className="grid gap-2 px-6 py-3.5 items-center"
          style={{
            gridTemplateColumns: `2.5fr 0.6fr 0.6fr 0.6fr 0.7fr ${additionalKeys.map(() => "0.8fr").join(" ")}`,
            borderBottom: idx < standings.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
            background: idx < 4 ? `linear-gradient(90deg, ${sportColor}10, ${sportColor}05)` : "transparent",
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-white/20 text-xs w-4 text-right">{row.rank}</span>
            <TeamRefLogo team={row.team} size={32} />
            <div className="min-w-0">
              <p className="text-white font-semibold text-sm truncate">{row.team.shortName}</p>
              <p className="text-white/35 text-xs truncate">{row.team.name}</p>
            </div>
          </div>
          <span className="text-center text-white/65 text-sm">{row.played}</span>
          <span className="text-center text-sm" style={{ color: "#00E676" }}>{row.won}</span>
          <span className="text-center text-sm" style={{ color: "#FF4D8D" }}>{row.lost}</span>
          <span className="text-center text-white font-black">{row.points}</span>
          {additionalKeys.map((k) => {
            const val = String(row.additional?.[k] ?? "-");
            return (
              <span key={k} className="text-center text-xs font-mono hidden md:block" style={{ color: val.startsWith("+") ? "#00E676" : val.startsWith("-") ? "#FF4D8D" : "#a6b0c4" }}>
                {val}
              </span>
            );
          })}
        </motion.div>
      ))}
    </GlassCard>
  );
}
