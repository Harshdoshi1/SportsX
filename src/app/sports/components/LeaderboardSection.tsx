import { motion } from "motion/react";
import type { Leaderboard } from "../sportTypes";
import { ACCENT_COLORS } from "../sportTypes";
import { PersonStatCard } from "./PersonStatCard";

interface LeaderboardSectionProps {
  leaderboard: Leaderboard;
  maxRows?: number;
}

export function LeaderboardSection({ leaderboard, maxRows = 10 }: LeaderboardSectionProps) {
  const accent = leaderboard.accent || "blue";
  const colors = ACCENT_COLORS[accent] || ACCENT_COLORS.blue;
  const displayRows = leaderboard.rows.slice(0, maxRows);

  if (displayRows.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-white font-bold text-base">{leaderboard.title}</h3>
          {leaderboard.subtitle && <p className="text-white/45 text-xs mt-1">{leaderboard.subtitle}</p>}
        </div>
        <span
          className="px-2 py-1 rounded text-[10px] font-bold uppercase"
          style={{ background: colors.badge, color: colors.text }}
        >
          Top {displayRows.length}
        </span>
      </div>

      <div className="space-y-3">
        {displayRows.map((row, idx) => (
          <motion.div
            key={`${row.person.id}-${idx}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.02 }}
          >
            <PersonStatCard row={row} accent={accent} />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
