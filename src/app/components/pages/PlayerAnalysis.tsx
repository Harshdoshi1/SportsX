import { motion } from "motion/react";
import { useParams } from "react-router";
import { Navbar } from "../ui/Navbar";
import { GlassCard } from "../ui/GlassCard";
import { BackButton } from "../ui/BackButton";
import { Breadcrumbs } from "../ui/Breadcrumbs";
import { TeamLogo } from "../ui/TeamLogo";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import { Award, Target, TrendingUp, Shield } from "lucide-react";
import { IPL_TEAM_PROFILES, IPL_PLAYER_IMAGES, getStandingByTeamId } from "../../data/ipl2026";

function roleEmoji(role: string) {
  if (role.includes("WK")) return "🧤";
  if (role.includes("All-rounder")) return "⚡";
  if (role.includes("Bowler")) return "🎯";
  return "🏏";
}

function v(value?: number | null, digits = 2) {
  if (value === undefined || value === null) return "-";
  if (Number.isInteger(value)) return `${value}`;
  return value.toFixed(digits);
}

export function PlayerAnalysis() {
  const { sportId, leagueId, teamId, playerId } = useParams<{ sportId: string; leagueId: string; teamId: string; playerId: string }>();

  const team = IPL_TEAM_PROFILES[(teamId || "rcb").toLowerCase()] || IPL_TEAM_PROFILES.rcb;
  const player = team.fullSquad.find((p) => p.id === playerId) || team.topPerformers.find((p) => p.id === playerId) || team.fullSquad[0];
  const standing = getStandingByTeamId(team.teamId);
  const playerImage = IPL_PLAYER_IMAGES[player.id];
  const showCelebrationVideo = player.id === "virat-kohli";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.45 }} className="min-h-screen">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <BackButton to={`/sport/${sportId}/league/${leagueId}/team/${teamId}`} />
          <Breadcrumbs
            items={[
              { label: "Cricket", path: `/sport/${sportId}` },
              { label: "IPL 2026", path: `/sport/${sportId}/league/${leagueId}` },
              { label: team.short, path: `/sport/${sportId}/league/${leagueId}/team/${teamId}` },
              { label: player.name },
            ]}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative overflow-hidden rounded-3xl p-6 md:p-10 mb-8"
          style={{
            background: `linear-gradient(135deg, ${team.color}18 0%, rgba(124,77,255,0.12) 100%)`,
            border: `1px solid ${team.color}45`,
          }}
        >
          <div className="relative grid grid-cols-1 md:grid-cols-[minmax(220px,320px)_1fr] gap-8 items-center">
            <div
              className={`rounded-3xl flex items-center justify-center overflow-hidden ${showCelebrationVideo ? "w-[220px] h-[220px] md:w-[320px] md:h-[320px]" : "w-32 h-32"}`}
              style={{ background: "rgba(6,10,24,0.95)", border: "1px solid rgba(255,255,255,0.15)" }}
            >
              {showCelebrationVideo ? (
                <video
                  src="/assets/videos/virat-kohli.mp4"
                  autoPlay
                  muted
                  playsInline
                  preload="auto"
                  poster={playerImage}
                  className="w-full h-full object-cover"
                />
              ) : playerImage ? (
                <ImageWithFallback src={playerImage} alt={player.name} className="w-full h-full object-contain p-1" fallbackMode="person" />
              ) : (
                roleEmoji(player.role)
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="px-2 py-0.5 rounded-lg text-xs font-semibold" style={{ background: `${team.color}20`, border: `1px solid ${team.color}35`, color: team.color }}>
                  {player.role}
                </span>
                {showCelebrationVideo && <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold text-white/75" style={{ background: "rgba(59,212,231,0.14)", border: "1px solid rgba(59,212,231,0.28)" }}>Celebration Clip</span>}
                <span className="text-white/35 text-xs">{team.name}</span>
              </div>
              <h1 className={`font-black text-white mb-2 ${showCelebrationVideo ? "text-4xl md:text-6xl" : "text-4xl md:text-5xl"}`}>{player.name}</h1>
              <div className="flex flex-wrap items-center gap-3 text-white/50 text-sm">
                <span className="flex items-center gap-1.5"><TeamLogo teamId={team.teamId} short={team.short} size={22} /> {team.short}</span>
                {standing && <span>Team Record: {standing.won}W - {standing.lost}L</span>}
                {player.bbi && <span>Best: {player.bbi}</span>}
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-8">
          {[
            { label: "Matches", val: v(player.matches, 0), color: "#3BD4E7" },
            { label: "Runs", val: v(player.runs, 0), color: "#FF9100" },
            { label: "Average", val: v(player.avg), color: "#00E676" },
            { label: "Strike Rate", val: v(player.sr), color: "#FF4D8D" },
            { label: "Wickets", val: v(player.wickets, 0), color: "#7C4DFF" },
            { label: "Economy", val: v(player.economy), color: "#3BD4E7" },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.05 }}>
              <GlassCard className="p-4 text-center">
                <div className="text-2xl font-black" style={{ color: s.color }}>{s.val}</div>
                <div className="text-white/30 text-xs mt-1">{s.label}</div>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <GlassCard className="p-6">
            <h3 className="text-white font-bold mb-3 flex items-center gap-2"><TrendingUp size={18} style={{ color: "#3BD4E7" }} /> Season Snapshot</h3>
            <p className="text-white/60 text-sm">This profile reflects the IPL 2026 numbers currently available for this player in your provided dataset.</p>
          </GlassCard>

          <GlassCard className="p-6">
            <h3 className="text-white font-bold mb-3 flex items-center gap-2"><Target size={18} style={{ color: "#FF4D8D" }} /> Role Context</h3>
            <p className="text-white/70 text-sm">Primary role: {player.role}</p>
            <p className="text-white/45 text-sm mt-1">Team: {team.name}</p>
          </GlassCard>

          <GlassCard className="p-6">
            <h3 className="text-white font-bold mb-3 flex items-center gap-2"><Award size={18} style={{ color: "#FF9100" }} /> Team Context</h3>
            {standing ? (
              <>
                <p className="text-white/70 text-sm">Points: {standing.pts}</p>
                <p className="text-white/70 text-sm">NRR: {standing.nrr}</p>
                <p className="text-white/70 text-sm">Record: {standing.won}W - {standing.lost}L</p>
              </>
            ) : (
              <p className="text-white/55 text-sm">Standing not available</p>
            )}
            <div className="mt-3 flex items-center gap-2 text-xs text-white/40"><Shield size={12} /> Data synced with IPL points table context</div>
          </GlassCard>
        </div>
      </div>
    </motion.div>
  );
}
