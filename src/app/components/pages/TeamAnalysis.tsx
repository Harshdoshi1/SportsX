import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate, useParams } from "react-router";
import { Navbar } from "../ui/Navbar";
import { GlassCard } from "../ui/GlassCard";
import { BackButton } from "../ui/BackButton";
import { Breadcrumbs } from "../ui/Breadcrumbs";
import { TeamLogo } from "../ui/TeamLogo";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import { Trophy, TrendingUp, Target, Shield, Star } from "lucide-react";
import { IPL_STANDINGS, IPL_TEAM_PROFILES, IPL_PLAYER_IMAGES, SquadPlayer } from "../../data/ipl2026";

const tabs = ["Playing XI", "Full Squad", "Analytics"];

function roleEmoji(role: string) {
  if (role.includes("WK")) return "🧤";
  if (role.includes("All-rounder")) return "⚡";
  if (role.includes("Bowler")) return "🎯";
  return "🏏";
}

function formatValue(value?: number | null, decimals = 2) {
  if (value === undefined || value === null) return "-";
  if (Number.isInteger(value)) return `${value}`;
  return value.toFixed(decimals);
}

function PlayerCard({ player, onClick }: { player: SquadPlayer; onClick: () => void }) {
  const imageUrl = IPL_PLAYER_IMAGES[player.id];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -3, scale: 1.01 }}
      onClick={onClick}
      className="cursor-pointer rounded-2xl overflow-hidden"
      style={{ background: "rgba(8,12,28,0.9)", border: "1px solid rgba(150,170,255,0.14)" }}
    >
      <div className="p-4 pb-3">
        <div
          className="w-full h-24 rounded-xl mb-3 flex items-center justify-center overflow-hidden"
          style={{ background: "linear-gradient(135deg, rgba(20,28,56,0.95), rgba(14,22,48,0.95))", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          {imageUrl ? (
            <ImageWithFallback src={imageUrl} alt={player.name} className="w-full h-full object-contain p-1" fallbackMode="person" />
          ) : (
            <span className="text-4xl">{roleEmoji(player.role)}</span>
          )}
        </div>
        <h4 className="text-white font-bold text-sm leading-tight truncate">{player.name}</h4>
        <p className="text-white/40 text-xs mt-0.5">{player.role}</p>
      </div>
      <div className="px-4 pb-4 space-y-1.5">
        <div className="flex justify-between text-xs"><span className="text-white/30">Matches</span><span className="text-white/80 font-semibold">{formatValue(player.matches, 0)}</span></div>
        <div className="flex justify-between text-xs"><span className="text-white/30">Runs</span><span className="text-white/80 font-semibold">{formatValue(player.runs, 0)}</span></div>
        <div className="flex justify-between text-xs"><span className="text-white/30">Wkts</span><span className="text-white/80 font-semibold">{formatValue(player.wickets, 0)}</span></div>
        <div className="flex justify-between text-xs"><span className="text-white/30">SR/Econ</span><span className="text-white/80 font-semibold">{player.sr ? formatValue(player.sr) : player.economy ? formatValue(player.economy) : "-"}</span></div>
      </div>
    </motion.div>
  );
}

export function TeamAnalysis() {
  const navigate = useNavigate();
  const { sportId, leagueId, teamId } = useParams<{ sportId: string; leagueId: string; teamId: string }>();
  const [activeTab, setActiveTab] = useState("Playing XI");

  const normalizedTeamId = (teamId || "rcb").toLowerCase();
  const team = IPL_TEAM_PROFILES[normalizedTeamId] || IPL_TEAM_PROFILES.rcb;
  const standing = IPL_STANDINGS.find((row) => row.teamId === team.teamId) || IPL_STANDINGS[1];
  const rank = (IPL_STANDINGS.findIndex((row) => row.teamId === team.teamId) + 1) || 2;

  const playerList = useMemo(() => {
    if (activeTab === "Playing XI") return team.topPerformers;
    return team.fullSquad;
  }, [activeTab, team]);

  const winRate = ((standing.won / Math.max(standing.played, 1)) * 100).toFixed(0);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.45 }} className="min-h-screen">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <BackButton to={`/sport/${sportId}/league/${leagueId}`} />
          <Breadcrumbs
            items={[
              { label: "Cricket", path: `/sport/${sportId}` },
              { label: "IPL 2026", path: `/sport/${sportId}/league/${leagueId}` },
              { label: team.short },
            ]}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative overflow-hidden rounded-3xl p-6 md:p-8 mb-8"
          style={{
            background: `linear-gradient(135deg, ${team.color}16 0%, rgba(40, 58, 108, 0.6) 100%)`,
            border: `1px solid ${team.color}40`,
          }}
        >
          <div className="relative flex flex-col md:flex-row items-start md:items-center gap-6">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="w-24 h-24 rounded-3xl flex items-center justify-center flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${team.color}28, rgba(0,0,0,0.1))`, border: `2px solid ${team.color}45` }}
            >
              <TeamLogo teamId={team.teamId} short={team.short} size={72} />
            </motion.div>

            <div className="flex-1">
              <p className="text-white/40 text-xs uppercase tracking-widest mb-1">IPL 2026 · Rank #{rank}</p>
              <h1 className="text-3xl md:text-4xl font-black text-white mb-2">{team.name}</h1>
              <div className="flex flex-wrap gap-3">
                <span className="text-white/50 text-sm">📍 {team.homeGround}</span>
                <span className="text-white/50 text-sm">👑 {team.captain}</span>
                <span className="text-white/50 text-sm">📅 Founded {team.founded}</span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {[
                { val: standing.played, label: "Played" },
                { val: standing.won, label: "Won", color: "#00E676" },
                { val: standing.lost, label: "Lost", color: "#FF4D8D" },
                { val: team.titles, label: "Titles", color: "#FF9100" },
              ].map(({ val, label, color }) => (
                <div key={label} className="text-center p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }}>
                  <div className="text-2xl font-black" style={{ color: color || "white" }}>{val}</div>
                  <div className="text-white/30 text-xs">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Trophy, label: "Points", val: `${standing.pts}`, color: "#FF9100" },
            { icon: TrendingUp, label: "NRR", val: standing.nrr, color: "#00E676" },
            { icon: Target, label: "Win Rate", val: `${winRate}%`, color: "#3BD4E7" },
            { icon: Shield, label: "Squad Size", val: `${team.fullSquad.length}`, color: "#7C4DFF" },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 + i * 0.07 }}>
              <GlassCard className="p-4" hover>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${s.color}18` }}>
                    <s.icon size={18} style={{ color: s.color }} />
                  </div>
                  <div>
                    <div className="text-xl font-black text-white">{s.val}</div>
                    <div className="text-white/30 text-xs">{s.label}</div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        <div className="flex gap-1 p-1 rounded-xl mb-8 w-fit" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          {tabs.map((tab) => (
            <motion.button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all"
              style={activeTab === tab ? { background: "linear-gradient(135deg, #3BD4E7, #7C4DFF)", color: "white" } : { color: "rgba(255,255,255,0.42)" }}
            >
              {tab}
            </motion.button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {(activeTab === "Playing XI" || activeTab === "Full Squad") && (
            <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              {activeTab === "Playing XI" && (
                <div className="flex items-center gap-3 mb-5 p-4 rounded-2xl" style={{ background: "rgba(0,230,118,0.07)", border: "1px solid rgba(0,230,118,0.18)" }}>
                  <Shield size={18} style={{ color: "#00E676" }} />
                  <p className="text-white/60 text-sm">Top performers for IPL 2026 so far. Click a player to open player analysis.</p>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {playerList.map((player) => (
                  <PlayerCard
                    key={player.id}
                    player={player}
                    onClick={() => navigate(`/sport/${sportId}/league/${leagueId}/team/${team.teamId}/player/${player.id}`)}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === "Analytics" && (
            <motion.div key="analytics" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <GlassCard className="p-6">
                  <h3 className="text-white font-bold mb-3 flex items-center gap-2"><Star size={18} style={{ color: "#3BD4E7" }} /> Current Standing Snapshot</h3>
                  <p className="text-white/70 text-sm">Position: #{rank}</p>
                  <p className="text-white/70 text-sm">Record: {standing.won}W - {standing.lost}L ({standing.played} played)</p>
                  <p className="text-white/70 text-sm">Points: {standing.pts}</p>
                  <p className="text-white/70 text-sm">NRR: {standing.nrr}</p>
                </GlassCard>

                <GlassCard className="p-6 md:col-span-2">
                  <h3 className="text-white font-bold mb-3">Top Performers</h3>
                  <div className="space-y-3">
                    {team.topPerformers.map((p) => (
                      <div key={p.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl overflow-hidden" style={{ background: "rgba(10,16,34,0.95)", border: "1px solid rgba(255,255,255,0.1)" }}>
                            {IPL_PLAYER_IMAGES[p.id] ? (
                              <ImageWithFallback src={IPL_PLAYER_IMAGES[p.id]} alt={p.name} className="w-full h-full object-contain" fallbackMode="person" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-lg">{roleEmoji(p.role)}</div>
                            )}
                          </div>
                          <div>
                          <p className="text-white font-semibold text-sm">{p.name}</p>
                          <p className="text-white/40 text-xs">{p.role}</p>
                          </div>
                        </div>
                        <div className="text-right text-xs text-white/70">
                          <p>Runs: {formatValue(p.runs, 0)}</p>
                          <p>Wkts: {formatValue(p.wickets, 0)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
