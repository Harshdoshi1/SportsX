import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate, useParams } from "react-router";
import { Navbar } from "../ui/Navbar";
import { GlassCard } from "../ui/GlassCard";
import { BackButton } from "../ui/BackButton";
import { Breadcrumbs } from "../ui/Breadcrumbs";
import { TeamLogo } from "../ui/TeamLogo";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import { Trophy, TrendingUp, Target, Shield } from "lucide-react";
import { cricketApi } from "../../services/cricketApi";
import { deriveTeamShort, getTeamLogoProps, isIplTeamName, normalizeText, safeArray } from "../../services/cricketUi";

const tabs = ["Playing XI", "Full Squad", "Analytics"];

type ApiTeam = {
  id: string | number;
  name: string;
  image?: string;
  played?: number;
  won?: number;
  lost?: number;
  pts?: number;
  nrr?: string;
};

type ApiPlayer = {
  id: string | number;
  name: string;
  role?: string;
  image?: string;
  matches?: number;
  runs?: number;
  wickets?: number;
  average?: number;
  strikeRate?: number;
  economy?: number;
};

function formatValue(value?: number | null, decimals = 2) {
  if (value === undefined || value === null || Number.isNaN(value)) return "-";
  if (Number.isInteger(value)) return `${value}`;
  return value.toFixed(decimals);
}

function PlayerCard({ player, onClick }: { player: ApiPlayer; onClick: () => void }) {
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
          {player.image ? (
            <ImageWithFallback src={player.image} alt={player.name} className="w-full h-full object-contain p-1" fallbackMode="person" />
          ) : (
            <span className="text-4xl">🏏</span>
          )}
        </div>
        <h4 className="text-white font-bold text-sm leading-tight truncate">{player.name}</h4>
        <p className="text-white/40 text-xs mt-0.5">{player.role || "Cricketer"}</p>
      </div>
      <div className="px-4 pb-4 space-y-1.5">
        <div className="flex justify-between text-xs"><span className="text-white/30">Matches</span><span className="text-white/80 font-semibold">{formatValue(player.matches, 0)}</span></div>
        <div className="flex justify-between text-xs"><span className="text-white/30">Runs</span><span className="text-white/80 font-semibold">{formatValue(player.runs, 0)}</span></div>
        <div className="flex justify-between text-xs"><span className="text-white/30">Wkts</span><span className="text-white/80 font-semibold">{formatValue(player.wickets, 0)}</span></div>
      </div>
    </motion.div>
  );
}

export function TeamAnalysis() {
  const navigate = useNavigate();
  const { sportId, leagueId, teamId } = useParams<{ sportId: string; leagueId: string; teamId: string }>();
  const [activeTab, setActiveTab] = useState("Playing XI");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [team, setTeam] = useState<ApiTeam | null>(null);
  const [players, setPlayers] = useState<ApiPlayer[]>([]);

  useEffect(() => {
    let active = true;

    const loadTeam = async () => {
      try {
        setLoading(true);
        setError(null);

        const teamsRes = await cricketApi.getTeams({ page: 1, limit: 500 });
        const teams = safeArray<ApiTeam>((teamsRes as any).teams).filter((item) => isIplTeamName(item?.name));

        const param = String(teamId || "").toLowerCase();
        const byId = teams.find((item) => String(item.id) === param);
        const byShort = teams.find((item) => deriveTeamShort(item.name).toLowerCase() === param);
        const byName = teams.find((item) => normalizeText(item.name) === normalizeText(param));
        const selected = byId || byShort || byName || teams[0] || null;

        if (!selected) {
          throw new Error("No IPL team found in API response");
        }

        const playersRes = await cricketApi.getTeamPlayers(selected.id);
        const teamPlayers = safeArray<ApiPlayer>((playersRes as any).players);

        if (!active) {
          return;
        }

        setTeam(selected);
        setPlayers(teamPlayers);
      } catch (fetchError: any) {
        if (!active) {
          return;
        }
        setError(fetchError?.message || "Failed to load team analysis");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadTeam();

    return () => {
      active = false;
    };
  }, [teamId]);

  const topPlayers = useMemo(() => players.slice(0, 11), [players]);
  const playerList = activeTab === "Playing XI" ? topPlayers : players;
  const teamLogo = getTeamLogoProps(team?.name);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.45 }} className="min-h-screen">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <BackButton to={`/sport/${sportId}/league/${leagueId}`} />
          <Breadcrumbs
            items={[
              { label: "Cricket", path: `/sport/${sportId}` },
              { label: "IPL", path: `/sport/${sportId}/league/${leagueId}` },
              { label: team?.name || "Team" },
            ]}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative overflow-hidden rounded-3xl p-6 md:p-8 mb-8"
          style={{
            background: "linear-gradient(135deg, rgba(59,212,231,0.16) 0%, rgba(40, 58, 108, 0.6) 100%)",
            border: "1px solid rgba(59,212,231,0.4)",
          }}
        >
          <div className="relative flex flex-col md:flex-row items-start md:items-center gap-6">
            <div
              className="w-24 h-24 rounded-3xl flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg, rgba(59,212,231,0.2), rgba(0,0,0,0.1))", border: "2px solid rgba(59,212,231,0.45)" }}
            >
              <TeamLogo teamId={teamLogo.teamId} short={teamLogo.short} size={72} />
            </div>

            <div className="flex-1">
              <p className="text-white/40 text-xs uppercase tracking-widest mb-1">IPL Live Team</p>
              <h1 className="text-3xl md:text-4xl font-black text-white mb-2">{team?.name || "Loading..."}</h1>
              <div className="flex flex-wrap gap-3">
                <span className="text-white/50 text-sm">Team ID: {team?.id || "-"}</span>
                <span className="text-white/50 text-sm">Players loaded: {players.length}</span>
              </div>
              {error && <p className="text-[#ff8ca8] text-xs mt-2">{error}</p>}
            </div>

            <div className="grid grid-cols-4 gap-3">
              {[
                { val: team?.played ?? 0, label: "Played" },
                { val: team?.won ?? 0, label: "Won", color: "#00E676" },
                { val: team?.lost ?? 0, label: "Lost", color: "#FF4D8D" },
                { val: team?.pts ?? 0, label: "Pts", color: "#FF9100" },
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
            { icon: Trophy, label: "Points", val: `${team?.pts ?? 0}`, color: "#FF9100" },
            { icon: TrendingUp, label: "NRR", val: team?.nrr || "-", color: "#00E676" },
            {
              icon: Target,
              label: "Win Rate",
              val: `${team?.played ? Math.round(((team?.won || 0) / Math.max(team.played, 1)) * 100) : 0}%`,
              color: "#3BD4E7",
            },
            { icon: Shield, label: "Squad Size", val: `${players.length}`, color: "#7C4DFF" },
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
              {loading && <p className="text-white/45 text-sm mb-4">Loading squad...</p>}
              {!loading && playerList.length === 0 && <p className="text-white/45 text-sm mb-4">No player data available for this team.</p>}

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {playerList.map((player) => (
                  <PlayerCard
                    key={String(player.id)}
                    player={player}
                    onClick={() => navigate(`/sport/${sportId}/league/${leagueId}/team/${team?.id}/player/${player.id}`)}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === "Analytics" && (
            <motion.div key="analytics" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <GlassCard className="p-6">
                  <h3 className="text-white font-bold mb-3">Team Snapshot</h3>
                  <p className="text-white/70 text-sm">Record: {team?.won ?? 0}W - {team?.lost ?? 0}L ({team?.played ?? 0} played)</p>
                  <p className="text-white/70 text-sm">Points: {team?.pts ?? 0}</p>
                  <p className="text-white/70 text-sm">NRR: {team?.nrr || "-"}</p>
                </GlassCard>

                <GlassCard className="p-6">
                  <h3 className="text-white font-bold mb-3">Squad Feed</h3>
                  <p className="text-white/70 text-sm">Playing XI preview: {topPlayers.length} players</p>
                  <p className="text-white/70 text-sm">Full squad entries: {players.length}</p>
                </GlassCard>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
