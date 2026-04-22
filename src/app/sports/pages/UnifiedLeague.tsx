import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate, useParams } from "react-router";
import { Navbar } from "../../components/ui/Navbar";
import { BackButton } from "../../components/ui/BackButton";
import { Breadcrumbs } from "../../components/ui/Breadcrumbs";
import type { SportPageData } from "../sportTypes";
import { getSportData } from "../adapters";
import { SportHeader } from "../components/SportHeader";
import { LeaderboardSection } from "../components/LeaderboardSection";
import { TeamGrid } from "../components/TeamGrid";
import { StandingsTable } from "../components/StandingsTable";
import { FixturesSection } from "../components/FixturesSection";
import { EmptyState } from "../components/EmptyState";

const TABS = ["Overview", "Teams", "Stats", "Fixtures"];

export function UnifiedLeague() {
  const navigate = useNavigate();
  const { sportId, leagueId } = useParams<{ sportId: string; leagueId: string }>();
  const [data, setData] = useState<SportPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("Overview");

  useEffect(() => {
    if (!leagueId) return;
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await getSportData(leagueId);
        if (!active) return;
        if (!result) {
          setError(`No data adapter found for league "${leagueId}"`);
        } else {
          setData(result);
        }
      } catch (err: any) {
        if (active) setError(err?.message || "Failed to load sport data");
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => { active = false; };
  }, [leagueId]);

  const breadcrumbSportName = sportId === "f1" ? "Formula 1" : sportId === "basketball" ? "Basketball" : "Cricket";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="min-h-screen">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">

        {/* Navigation */}
        <div className="flex items-center justify-between mb-8">
          <BackButton to={sportId ? `/sport/${sportId}` : "/dashboard"} />
          <Breadcrumbs items={[
            { label: breadcrumbSportName, path: `/sport/${sportId}` },
            { label: data?.leagueName || leagueId || "League" },
          ]} />
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-8 h-8 rounded-full border-2 border-white/20 border-t-[#3BD4E7]" />
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <EmptyState title="Error Loading Data" message={error} icon="⚠️" />
        )}

        {/* Content */}
        {data && !loading && (
          <>
            <SportHeader data={data} />

            {/* Tabs */}
            <div className="flex gap-1 p-1 rounded-xl mb-8 w-fit" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              {TABS.map((tab) => (
                <motion.button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all"
                  style={
                    activeTab === tab
                      ? { background: `linear-gradient(135deg, ${data.sportColor}, #7C4DFF)`, color: "white", boxShadow: `0 0 20px ${data.sportColor}40` }
                      : { color: "rgba(255,255,255,0.45)" }
                  }
                >
                  {tab}
                </motion.button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {/* ─── Overview Tab ─── */}
              {activeTab === "Overview" && (
                <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-8">
                  {/* Standings */}
                  {data.standings && data.standings.length > 0 && (
                    <StandingsTable standings={data.standings.slice(0, 5)} title="Top 5 Standings" sportColor={data.sportColor} />
                  )}

                  {/* Featured leaderboards (show first 2 with top 5 each) */}
                  {data.featuredLeaderboards.slice(0, 2).map((lb) => (
                    <LeaderboardSection key={lb.key} leaderboard={{ ...lb, rows: lb.rows.slice(0, 5) }} maxRows={5} />
                  ))}

                  {/* Upcoming fixtures preview */}
                  {data.fixtures && data.fixtures.length > 0 && (
                    <FixturesSection title="Upcoming" fixtures={data.fixtures.slice(0, 3)} type="upcoming" />
                  )}
                </motion.div>
              )}

              {/* ─── Teams Tab ─── */}
              {activeTab === "Teams" && (
                <motion.div key="teams" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-8">
                  {data.teams.length > 0 ? (
                    <>
                      <TeamGrid teams={data.teams} />
                      {data.standings && data.standings.length > 0 && (
                        <StandingsTable standings={data.standings} title="Full Standings" sportColor={data.sportColor} />
                      )}
                    </>
                  ) : (
                    <EmptyState title="No Teams" message="Team data is not available for this league." icon="👥" />
                  )}
                </motion.div>
              )}

              {/* ─── Stats Tab ─── */}
              {activeTab === "Stats" && (
                <motion.div key="stats" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                  {data.featuredLeaderboards.length > 0 ? (
                    data.featuredLeaderboards.map((lb) => (
                      <LeaderboardSection key={lb.key} leaderboard={lb} />
                    ))
                  ) : (
                    <EmptyState title="No Stats" message="Statistics are not available for this league yet." icon="📊" />
                  )}
                </motion.div>
              )}

              {/* ─── Fixtures Tab ─── */}
              {activeTab === "Fixtures" && (
                <motion.div key="fixtures" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-6">
                  {data.fixtures && data.fixtures.length > 0 ? (
                    <FixturesSection title="Upcoming Fixtures" fixtures={data.fixtures} type="upcoming" />
                  ) : (
                    <EmptyState title="No Upcoming Fixtures" message="No upcoming fixtures to display." icon="📅" />
                  )}
                  {data.results && data.results.length > 0 && (
                    <FixturesSection title="Recent Results" fixtures={data.results} type="completed" />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </motion.div>
  );
}
