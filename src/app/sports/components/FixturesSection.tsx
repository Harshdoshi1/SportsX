import { motion } from "motion/react";
import type { FixtureRow } from "../sportTypes";
import { TeamRefLogo } from "./TeamRefLogo";
import { GlassCard } from "../../components/ui/GlassCard";
import { Calendar, MapPin } from "lucide-react";

interface FixturesSectionProps {
  title: string;
  fixtures: FixtureRow[];
  type: "upcoming" | "completed";
}

export function FixturesSection({ title, fixtures, type }: FixturesSectionProps) {
  if (fixtures.length === 0) return null;

  return (
    <GlassCard className="overflow-hidden">
      <div className="px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <h3 className="text-white font-bold">{title}</h3>
      </div>
      <div className="space-y-3 p-4 md:p-6">
        {fixtures.map((fix, idx) => (
          <motion.div
            key={fix.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.02 }}
            className="rounded-2xl p-4 md:p-5"
            style={{
              background: idx === 0 && type === "upcoming"
                ? "linear-gradient(135deg, rgba(59,212,231,0.16), rgba(124,77,255,0.16))"
                : "linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              {/* Teams */}
              <div className="flex items-center gap-4 md:gap-6">
                <div className="flex items-center gap-3 min-w-0">
                  <TeamRefLogo team={fix.homeTeam} size={38} />
                  <div className="min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{fix.homeTeam.name}</p>
                    {fix.homeScore && <p className="text-[#7ad6ff] text-xs font-mono">{fix.homeScore}</p>}
                  </div>
                </div>
                <span className="text-white/45 font-black tracking-wide text-sm">VS</span>
                <div className="flex items-center gap-3 min-w-0">
                  <TeamRefLogo team={fix.awayTeam} size={38} />
                  <div className="min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{fix.awayTeam.name}</p>
                    {fix.awayScore && <p className="text-[#7ad6ff] text-xs font-mono">{fix.awayScore}</p>}
                  </div>
                </div>
              </div>

              {/* Date + Status */}
              <div className="flex items-center gap-3 text-xs md:text-sm">
                {idx === 0 && type === "upcoming" && (
                  <span className="px-2 py-1 rounded-md font-bold" style={{ background: "rgba(59,212,231,0.18)", color: "#7ad6ff" }}>NEXT</span>
                )}
                <span className="px-2 py-1 rounded-md text-white/85" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <Calendar size={12} className="inline mr-1.5" />
                  {fix.date}
                </span>
                {type === "completed" && fix.result && (
                  <span className="text-white/60 text-xs hidden md:block">{fix.result}</span>
                )}
              </div>
            </div>

            {/* Venue + Match label */}
            <div className="mt-3 pt-3 text-xs text-white/45 flex items-center gap-2" style={{ borderTop: "1px dashed rgba(255,255,255,0.14)" }}>
              {fix.matchLabel && <span className="font-semibold">{fix.matchLabel}</span>}
              {fix.matchLabel && fix.venue && <span>·</span>}
              {fix.venue && <><MapPin size={10} className="inline" /> {fix.venue}</>}
            </div>

            {/* Result for completed matches (mobile) */}
            {type === "completed" && fix.result && (
              <p className="text-white/60 text-xs mt-2 md:hidden">{fix.result}</p>
            )}
          </motion.div>
        ))}
      </div>
    </GlassCard>
  );
}
