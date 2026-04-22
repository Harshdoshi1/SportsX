import { motion } from "motion/react";
import type { LeaderboardRow } from "../sportTypes";
import { ACCENT_COLORS } from "../sportTypes";
import { TeamRefLogo } from "./TeamRefLogo";
import { ImageWithFallback } from "../../components/figma/ImageWithFallback";

interface PersonStatCardProps {
  row: LeaderboardRow;
  accent?: string;
  onClick?: () => void;
}

export function PersonStatCard({ row, accent = "blue", onClick }: PersonStatCardProps) {
  const colors = ACCENT_COLORS[accent] || ACCENT_COLORS.blue;
  const metaEntries = row.meta ? Object.entries(row.meta).filter(([, v]) => v != null).slice(0, 4) : [];

  const metaColors = ["rgba(59,212,231,0.14)", "rgba(0,230,118,0.14)", "rgba(255,145,0,0.14)", "rgba(124,77,255,0.14)"];
  const metaBorders = ["rgba(59,212,231,0.16)", "rgba(0,230,118,0.16)", "rgba(255,145,0,0.16)", "rgba(124,77,255,0.16)"];
  const metaTextColors = ["#7ad6ff", "#00E676", "#ffc57a", "#c5a8ff"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={onClick ? "cursor-pointer" : ""}
      onClick={onClick}
    >
      <div
        className="rounded-2xl px-4 py-3 md:px-5 md:py-4 transition-all hover:border-white/15"
        style={{
          background: "linear-gradient(90deg, rgba(6,10,22,0.92) 0%, rgba(8,12,28,0.9) 55%, rgba(6,10,22,0.92) 100%)",
          border: "1px solid rgba(150,170,255,0.14)",
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 md:gap-4 items-stretch">
          {/* Left: Rank + Image + Name + Team */}
          <div className="flex items-center gap-3 min-w-0 h-full md:self-center">
            {/* Rank badge */}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
              style={{
                background: row.rank === 1
                  ? `linear-gradient(135deg, ${colors.bg}, ${colors.badge})`
                  : "rgba(255,255,255,0.06)",
                border: row.rank === 1
                  ? `1px solid ${colors.border}`
                  : "1px solid rgba(255,255,255,0.10)",
                color: row.rank === 1 ? colors.text : "rgba(255,255,255,0.65)",
              }}
            >
              #{row.rank}
            </div>

            {/* Person image */}
            <div
              className="rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
              style={{ width: 48, height: 48, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
            >
              {row.person.imageUrl ? (
                <ImageWithFallback
                  src={row.person.imageUrl}
                  alt={row.person.name}
                  fallbackMode="person"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-3xl"
                  style={{ background: "linear-gradient(135deg, rgba(10,16,34,0.95), rgba(20,28,52,0.95))" }}
                >
                  👤
                </div>
              )}
            </div>

            {/* Name + team */}
            <div className="min-w-0">
              <p className="text-white font-semibold text-sm md:text-base leading-tight truncate">{row.person.name}</p>
              <div className="flex items-center gap-2 mt-1">
                {row.person.team && <TeamRefLogo team={row.person.team} size={18} />}
                <p className="text-white/45 text-xs truncate">
                  {row.person.team?.name || row.person.country || ""}
                  {row.person.country && row.person.team ? ` ${row.person.country}` : ""}
                </p>
              </div>
            </div>
          </div>

          {/* Right: Main value + meta stats */}
          <div className="flex flex-col gap-2 md:items-end">
            {/* Main value */}
            <div
              className="px-4 py-2 rounded-xl text-center"
              style={{ background: colors.bg, border: `1px solid ${colors.border}`, minWidth: 80 }}
            >
              <p className="text-white/40 text-[10px] uppercase tracking-wide">{row.valueLabel || "Value"}</p>
              <p className="font-black text-base" style={{ color: colors.text }}>{row.value}</p>
            </div>

            {/* Meta stats */}
            {metaEntries.length > 0 && (
              <div className={`grid gap-2 ${metaEntries.length <= 3 ? `grid-cols-${metaEntries.length}` : "grid-cols-4"} md:max-w-[340px] md:ml-auto`} style={{ gridTemplateColumns: `repeat(${Math.min(metaEntries.length, 4)}, 1fr)` }}>
                {metaEntries.map(([key, val], i) => (
                  <div
                    key={key}
                    className="px-3 py-1.5 rounded-xl text-center"
                    style={{ background: metaColors[i % metaColors.length], border: `1px solid ${metaBorders[i % metaBorders.length]}` }}
                  >
                    <p className="text-white/40 text-[10px] uppercase tracking-wide">{key}</p>
                    <p className="font-black text-xs" style={{ color: metaTextColors[i % metaTextColors.length] }}>{String(val)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
