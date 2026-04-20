import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { useParams } from "react-router";
import { Navbar } from "../ui/Navbar";
import { GlassCard } from "../ui/GlassCard";
import { BackButton } from "../ui/BackButton";
import { Breadcrumbs } from "../ui/Breadcrumbs";
import { TeamLogo } from "../ui/TeamLogo";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import { Award, Target, TrendingUp, Shield } from "lucide-react";
import { cricketApi } from "../../services/cricketApi";
import { deriveTeamShort, getTeamLogoProps, isIplTeamName, normalizeText, safeArray, slugify } from "../../services/cricketUi";

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

function v(value?: number | null, digits = 2) {
  if (value === undefined || value === null || Number.isNaN(value)) return "-";
  if (Number.isInteger(value)) return `${value}`;
  return value.toFixed(digits);
}

export function PlayerAnalysis() {
  const { sportId, leagueId, teamId, playerId } = useParams<{ sportId: string; leagueId: string; teamId: string; playerId: string }>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [team, setTeam] = useState<ApiTeam | null>(null);
  const [player, setPlayer] = useState<ApiPlayer | null>(null);

  useEffect(() => {
    let active = true;

    const loadPlayer = async () => {
      try {
        setLoading(true);
        setError(null);

        const teamsRes = await cricketApi.getTeams({ page: 1, limit: 500 });
        const teams = safeArray<ApiTeam>((teamsRes as any).teams).filter((item) => isIplTeamName(item?.name));

        const param = String(teamId || "").toLowerCase();
        const selectedTeam =
          teams.find((item) => String(item.id) === param) ||
          teams.find((item) => deriveTeamShort(item.name).toLowerCase() === param) ||
          teams.find((item) => normalizeText(item.name) === normalizeText(param)) ||
          teams[0] ||
          null;

        if (!selectedTeam) {
          throw new Error("Could not resolve team for player analysis");
        }

        const playersRes = await cricketApi.getTeamPlayers(selectedTeam.id);
        const players = safeArray<ApiPlayer>((playersRes as any).players);

        const selectedPlayer =
          players.find((item) => String(item.id) === String(playerId)) ||
          players.find((item) => slugify(item.name) === slugify(playerId)) ||
          players[0] ||
          null;

        if (!selectedPlayer) {
          throw new Error("No players returned for selected team");
        }

        if (!active) {
          return;
        }

        setTeam(selectedTeam);
        setPlayer(selectedPlayer);
      } catch (fetchError: any) {
        if (!active) {
          return;
        }
        setError(fetchError?.message || "Failed to load player data");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadPlayer();

    return () => {
      active = false;
    };
  }, [teamId, playerId]);

  const teamLogo = getTeamLogoProps(team?.name);

  const metrics = useMemo(
    () => [
      { label: "Matches", val: v(player?.matches, 0), color: "#3BD4E7" },
      { label: "Runs", val: v(player?.runs, 0), color: "#FF9100" },
      { label: "Average", val: v(player?.average), color: "#00E676" },
      { label: "Strike Rate", val: v(player?.strikeRate), color: "#FF4D8D" },
      { label: "Wickets", val: v(player?.wickets, 0), color: "#7C4DFF" },
      { label: "Economy", val: v(player?.economy), color: "#3BD4E7" },
    ],
    [player]
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.45 }} className="min-h-screen">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <BackButton to={`/sport/${sportId}/league/${leagueId}/team/${teamId}`} />
          <Breadcrumbs
            items={[
              { label: "Cricket", path: `/sport/${sportId}` },
              { label: "IPL", path: `/sport/${sportId}/league/${leagueId}` },
              { label: team?.name || "Team", path: `/sport/${sportId}/league/${leagueId}/team/${teamId}` },
              { label: player?.name || "Player" },
            ]}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative overflow-hidden rounded-3xl p-6 md:p-10 mb-8"
          style={{
            background: "linear-gradient(135deg, rgba(59,212,231,0.18) 0%, rgba(124,77,255,0.12) 100%)",
            border: "1px solid rgba(59,212,231,0.45)",
          }}
        >
          <div className="relative grid grid-cols-1 md:grid-cols-[220px_1fr] gap-8 items-center">
            <div
              className="rounded-3xl flex items-center justify-center overflow-hidden w-[220px] h-[220px]"
              style={{ background: "rgba(6,10,24,0.95)", border: "1px solid rgba(255,255,255,0.15)" }}
            >
              {player?.image ? (
                <ImageWithFallback src={player.image} alt={player.name} className="w-full h-full object-contain p-1" fallbackMode="person" />
              ) : (
                <span className="text-6xl">🏏</span>
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="px-2 py-0.5 rounded-lg text-xs font-semibold" style={{ background: "rgba(59,212,231,0.2)", border: "1px solid rgba(59,212,231,0.35)", color: "#3BD4E7" }}>
                  {player?.role || "Cricketer"}
                </span>
                <span className="text-white/35 text-xs">{team?.name || "Team"}</span>
              </div>
              <h1 className="font-black text-white mb-2 text-4xl md:text-5xl">{player?.name || "Loading..."}</h1>
              <div className="flex flex-wrap items-center gap-3 text-white/50 text-sm">
                <span className="flex items-center gap-1.5"><TeamLogo teamId={teamLogo.teamId} short={teamLogo.short} size={22} /> {team?.name || "Team"}</span>
                <span>Player ID: {player?.id || "-"}</span>
              </div>
              {error && <p className="text-[#ff8ca8] text-xs mt-2">{error}</p>}
              {loading && <p className="text-white/45 text-xs mt-2">Loading player profile...</p>}
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-8">
          {metrics.map((s, i) => (
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
            <p className="text-white/60 text-sm">This profile is populated directly from your live player endpoint.</p>
          </GlassCard>

          <GlassCard className="p-6">
            <h3 className="text-white font-bold mb-3 flex items-center gap-2"><Target size={18} style={{ color: "#FF4D8D" }} /> Role Context</h3>
            <p className="text-white/70 text-sm">Primary role: {player?.role || "-"}</p>
            <p className="text-white/45 text-sm mt-1">Team: {team?.name || "-"}</p>
          </GlassCard>

          <GlassCard className="p-6">
            <h3 className="text-white font-bold mb-3 flex items-center gap-2"><Award size={18} style={{ color: "#FF9100" }} /> Team Context</h3>
            <p className="text-white/70 text-sm">Points: {team?.pts ?? "-"}</p>
            <p className="text-white/70 text-sm">NRR: {team?.nrr || "-"}</p>
            <p className="text-white/70 text-sm">Record: {team?.won ?? "-"}W - {team?.lost ?? "-"}L</p>
            <div className="mt-3 flex items-center gap-2 text-xs text-white/40"><Shield size={12} /> Live team standings fields when available</div>
          </GlassCard>
        </div>
      </div>
    </motion.div>
  );
}
