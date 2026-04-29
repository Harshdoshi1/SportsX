import React, { memo } from "react";
import { Activity, Clock3, MapPin, Radio } from "lucide-react";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import { TeamLogo } from "./TeamLogo";
import { Skeleton } from "./skeleton";
import {
  DASH,
  type LiveBatter,
  type LiveBowler,
  type ScoreDisplay,
  type ScorecardInnings,
  getTeamLogoProps,
  getPlayerImageUrl,
  isCompletedStatus,
  isLiveStatus,
  isUpcomingStatus,
} from "../../services/cricketUi";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";

type StatItem = {
  label: string;
  value: string;
};

type MatchHeaderCardProps = {
  series?: string | null;
  status?: string | null;
  venue?: string | null;
  dateTime?: string | null;
  team1: string;
  team2: string;
  team1Score: ScoreDisplay;
  team2Score: ScoreDisplay;
  result?: string | null;
  subtitle?: string | null;
  loading?: boolean;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
};

const badgeClasses = (status: string) => {
  if (isLiveStatus(status)) {
    return {
      bg: "rgba(239, 68, 68, 0.14)",
      border: "rgba(239, 68, 68, 0.35)",
      text: "#fda4af",
      label: "LIVE",
      icon: <Radio size={11} />,
    };
  }
  if (isUpcomingStatus(status)) {
    return {
      bg: "rgba(59, 130, 246, 0.14)",
      border: "rgba(59, 130, 246, 0.35)",
      text: "#93c5fd",
      label: "UPCOMING",
      icon: <Clock3 size={11} />,
    };
  }
  if (isCompletedStatus(status)) {
    return {
      bg: "rgba(34, 197, 94, 0.14)",
      border: "rgba(34, 197, 94, 0.35)",
      text: "#86efac",
      label: "FINISHED",
      icon: <Activity size={11} />,
    };
  }
  return {
    bg: "rgba(148, 163, 184, 0.14)",
    border: "rgba(148, 163, 184, 0.35)",
    text: "#cbd5e1",
    label: status || "STATUS",
    icon: <Activity size={11} />,
  };
};

const scoreText = (score: ScoreDisplay) => (score.runsText === DASH ? DASH : score.runsText);

const oversText = (score: ScoreDisplay) => String(score.oversText || "").trim() || DASH;

export const MatchStatusBadge = memo(function MatchStatusBadge({
  status,
}: {
  status?: string | null;
}) {
  const tone = badgeClasses(String(status || ""));

  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold tracking-[0.18em]"
      style={{
        background: tone.bg,
        border: `1px solid ${tone.border}`,
        color: tone.text,
      }}
    >
      {tone.icon}
      <span>{tone.label}</span>
    </div>
  );
});

function TeamScoreBlock({
  team,
  score,
  align = "left",
}: {
  team: string;
  score: ScoreDisplay;
  align?: "left" | "right";
}) {
  const logo = getTeamLogoProps(team);
  const isRight = align === "right";

  return (
    <div className={`flex items-center gap-6 ${isRight ? "flex-row-reverse text-right" : ""}`}>
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/[0.03] p-2 border border-white/5">
        <TeamLogo teamId={logo.teamId} short={logo.short} size={64} />
      </div>
      <div>
        <p className="text-xl font-black text-white md:text-2xl">{team || "Team"}</p>
        <div className="mt-1 flex items-end gap-2 justify-start">
          <span className={`text-3xl font-black text-white ${isRight ? "order-1" : ""}`}>{scoreText(score)}</span>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 pb-1.5">Overs {oversText(score)}</span>
        </div>
      </div>
    </div>
  );
}

export const MatchHeaderCard = memo(function MatchHeaderCard({
  series,
  status,
  venue,
  dateTime,
  team1,
  team2,
  team1Score,
  team2Score,
  result,
  subtitle,
  loading,
  actions,
  footer,
}: MatchHeaderCardProps) {
  return (
    <div
      className="relative overflow-hidden rounded-[2.5rem] border border-white/10 p-6 md:p-8"
      style={{
        background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)",
        backdropFilter: "blur(20px)",
      }}
    >
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-sky-500/10 blur-[100px]" />
      <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-purple-500/10 blur-[100px]" />

      <div className="relative flex flex-wrap items-start justify-between gap-6">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-4">
            <MatchStatusBadge status={status} />
            <span className="text-sm font-bold tracking-wide text-white/60">{series || DASH}</span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-[11px] font-medium uppercase tracking-widest text-white/40">
            <span className="inline-flex items-center gap-2">
              <MapPin size={14} className="text-sky-400" />
              {venue || DASH}
            </span>
            <span className="inline-flex items-center gap-2">
              <Clock3 size={14} className="text-purple-400" />
              {dateTime || DASH}
            </span>
          </div>
          {(subtitle || result) && (
            <div className="mt-4 rounded-xl bg-white/[0.03] px-4 py-2 border border-white/5">
              <p className="text-sm font-bold text-sky-400">{subtitle || result}</p>
            </div>
          )}
        </div>
        {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
      </div>

      <div className="relative mt-10 grid gap-8 md:grid-cols-[1fr_auto_1fr] md:items-center">
        {loading ? (
          <>
            <Skeleton className="h-24 rounded-3xl" />
            <Skeleton className="mx-auto h-12 w-12 rounded-full" />
            <Skeleton className="h-24 rounded-3xl" />
          </>
        ) : (
          <>
            <TeamScoreBlock team={team1} score={team1Score} />
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-sm font-black tracking-widest text-white/20">
              VS
            </div>
            <TeamScoreBlock team={team2} score={team2Score} align="right" />
          </>
        )}
      </div>

      {footer && <div className="relative mt-8 space-y-6">{footer}</div>}
    </div>
  );
});

export const KeyStatsRow = memo(function KeyStatsRow({ items }: { items: StatItem[] }) {
  const visibleItems = items.filter((item) => item.value && item.value !== DASH);
  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
      {visibleItems.map((item) => (
        <div
          key={item.label}
          className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-4 transition-all hover:bg-white/[0.04]"
        >
          <div className="absolute -right-4 -top-4 h-12 w-12 rounded-full bg-white/5 blur-xl group-hover:bg-white/10" />
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">{item.label}</p>
          <p className="mt-1 text-lg font-black text-white">{item.value}</p>
        </div>
      ))}
    </div>
  );
});

export const LiveNeedRow = memo(function LiveNeedRow({
  neededRuns,
  ballsRemaining,
  requiredRate,
  equation,
  isFirstInnings = false,
  totalRuns,
  totalBalls,
}: {
  neededRuns: number | null;
  ballsRemaining: number | null;
  requiredRate?: string | null;
  equation?: string | null;
  isFirstInnings?: boolean;
  totalRuns?: string;
  totalBalls?: string;
}) {
  if (isFirstInnings) {
    return (
      <div
        className="flex min-h-16 flex-wrap items-center justify-between gap-4 rounded-2xl border px-6 py-4"
        style={{
          background: "linear-gradient(90deg, rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0.02) 100%)",
          borderColor: "rgba(34, 197, 94, 0.2)",
        }}
      >
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-green-400/60">Current Progress</p>
            <p className="text-base font-black text-white">
              Scored {totalRuns || DASH} runs in {totalBalls || DASH} balls
            </p>
          </div>
        </div>
      </div>
    );
  }

  const hasPrimary = neededRuns != null && ballsRemaining != null;
  const hasEquation = String(equation || "").trim();
  if (!hasPrimary && !hasEquation) {
    return null;
  }

  return (
    <div
      className="flex min-h-16 flex-wrap items-center justify-between gap-4 rounded-2xl border px-6 py-4"
      style={{
        background: "linear-gradient(90deg, rgba(14, 165, 233, 0.1) 0%, rgba(14, 165, 233, 0.02) 100%)",
        borderColor: "rgba(56, 189, 248, 0.2)",
      }}
    >
      <div className="flex items-center gap-3">
        <div className="h-2 w-2 rounded-full bg-sky-500 animate-pulse" />
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-400/60">Chase Equation</p>
          <p className="text-base font-black text-white">
            {hasPrimary ? `Need ${neededRuns} runs in ${ballsRemaining} balls` : String(equation)}
          </p>
        </div>
      </div>
      <div className="rounded-lg bg-sky-500/10 px-3 py-1.5 border border-sky-500/20">
        <p className="text-sm font-black text-sky-400">{requiredRate && requiredRate !== DASH ? `RRR ${requiredRate}` : DASH}</p>
      </div>
    </div>
  );
});

const ballTone = (ball: string) => {
  if (!ball) {
    return {
      bg: "rgba(255,255,255,0.03)",
      border: "rgba(255,255,255,0.08)",
      text: "rgba(255,255,255,0.1)",
    };
  }
  const token = ball.toUpperCase();
  if (token.includes("W") && !token.includes("WD")) {
    return {
      bg: "rgba(239, 68, 68, 0.25)",
      border: "rgba(248, 113, 113, 0.35)",
      text: "#fff",
    };
  }
  if (token === "4") {
    return {
      bg: "rgba(56, 189, 248, 0.25)",
      border: "rgba(56, 189, 248, 0.35)",
      text: "#fff",
    };
  }
  if (token === "6") {
    return {
      bg: "rgba(34, 197, 94, 0.25)",
      border: "rgba(34, 197, 94, 0.35)",
      text: "#fff",
    };
  }
  if (token.includes("WD") || token.includes("NB")) {
    return {
      bg: "rgba(245, 158, 11, 0.2)",
      border: "rgba(245, 158, 11, 0.3)",
      text: "#fbbf24",
    };
  }
  return {
    bg: "rgba(255,255,255,0.08)",
    border: "rgba(255,255,255,0.12)",
    text: "rgba(255,255,255,0.8)",
  };
};

export const LastSixBallsStrip = memo(function LastSixBallsStrip({
  balls,
  compact = false,
}: {
  balls: string[];
  compact?: boolean;
}) {
  if (balls.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {!compact && (
        <div className="flex items-center gap-2 pr-2 border-r border-white/10 mr-2">
          <div className="h-1.5 w-1.5 rounded-full bg-white/20" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Recent</span>
        </div>
      )}
      <div className="flex items-center gap-2">
        {balls.map((ball, index) => {
          const tone = ballTone(ball);
          return (
            <div
              key={`${ball}-${index}`}
              className={`${compact ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-xs"} flex items-center justify-center rounded-full border font-black transition-all hover:scale-110 shadow-lg`}
              style={{
                background: tone.bg,
                borderColor: tone.border,
                color: tone.text,
              }}
            >
              {ball}
            </div>
          );
        })}
      </div>
    </div>
  );
});

const avatarFallback = (
  <div className="flex h-full w-full items-center justify-center text-[11px] font-bold text-white/45">?</div>
);

function PlayerStatRow({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-white/6 bg-white/[0.03] px-3 py-3">{children}</div>;
}

function PlayerAvatar({ name, imageUrl }: { name: string; imageUrl: string | null }) {
  return (
    <div className="h-11 w-11 overflow-hidden rounded-full border border-white/10 bg-white/[0.05]">
      {imageUrl ? (
        <ImageWithFallback
          src={imageUrl}
          alt={name}
          fallbackMode="person"
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        avatarFallback
      )}
    </div>
  );
}

function BatsmanLiveRow({ batter }: { batter: LiveBatter }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] p-4 transition-all hover:bg-white/[0.04] hover:border-white/10">
      <div className="relative flex items-center gap-4">
        <div className="relative">
          <PlayerAvatar name={batter.name} imageUrl={batter.imageUrl} />
          {batter.isOnStrike && (
            <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[10px] shadow-lg shadow-amber-400/20">
              ⭐
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-black text-white">{batter.name}</p>
            {batter.isOnStrike && <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Striking</span>}
          </div>
          <div className="mt-2 flex items-baseline gap-3">
            <p className="text-2xl font-black text-sky-400">{batter.runs || "0"}</p>
            <p className="text-xs font-bold text-white/30">({batter.balls || "0"} balls)</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/20">Strike Rate</p>
          <p className="text-sm font-black text-white/60">{batter.strikeRate || DASH}</p>
        </div>
      </div>
    </div>
  );
}

const bowlerBallTone = (ball: string) => {
  if (!ball) {
    return {
      bg: "rgba(255,255,255,0.03)",
      border: "rgba(255,255,255,0.08)",
      text: "rgba(255,255,255,0.1)",
    };
  }
  const token = ball.toUpperCase();
  if (token.includes("W") && !token.includes("WD")) {
    return {
      bg: "rgba(239, 68, 68, 0.25)",
      border: "rgba(248, 113, 113, 0.3)",
      text: "#fff",
    };
  }
  if (token.includes("4") || token.includes("6")) {
    return {
      bg: "rgba(34, 197, 94, 0.25)",
      border: "rgba(134, 239, 172, 0.3)",
      text: "#fff",
    };
  }
  return {
    bg: "rgba(255,255,255,0.1)",
    border: "rgba(255,255,255,0.15)",
    text: "#fff",
  };
};

function BowlerBallStrip({ balls }: { balls: string[] }) {
  return (
    <div className="mt-3 flex items-center gap-1.5">
      {balls.map((ball, index) => {
        const tone = bowlerBallTone(ball);
        return (
          <div
            key={`${ball || "empty"}-${index}`}
            className="flex h-7 w-7 items-center justify-center rounded-full border text-[10px] font-black transition-transform hover:scale-110"
            style={{
              background: tone.bg,
              borderColor: tone.border,
              color: tone.text,
            }}
          >
            {ball || ""}
          </div>
        );
      })}
    </div>
  );
}

function BowlerLiveRow({
  bowler,
  overBalls,
}: {
  bowler: LiveBowler;
  overBalls: string[];
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] p-4 transition-all hover:bg-white/[0.04] hover:border-white/10">
      <div className="relative flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black text-white">{bowler.name}</p>
          <div className="mt-2 flex items-baseline gap-3">
            <p className="text-2xl font-black text-rose-400">{bowler.wickets || "0"}-{bowler.runs || "0"}</p>
            <p className="text-xs font-bold text-white/30">({bowler.overs || "0.0"} ov)</p>
          </div>
          <BowlerBallStrip balls={overBalls} />
        </div>
        <PlayerAvatar name={bowler.name} imageUrl={bowler.imageUrl} />
      </div>
    </div>
  );
}

const isBatterRole = (role?: string | null) => /(batter|batsman|wk|wicket)/i.test(String(role || ""));

export const ProbablePlayingXI = memo(function ProbablePlayingXI({
  team1,
  team2,
  squad1,
  squad2,
  loading = false,
}: {
  team1: string;
  team2: string;
  squad1: any[];
  squad2: any[];
  loading?: boolean;
}) {
  const buildGroups = (squad: any[]) => {
    if (loading) {
       return [
         { title: "Openers", players: Array.from({ length: 2 }).map((_, i) => ({ id: `s-o-${i}`, isSkeleton: true })) },
         { title: "Middle Order", players: Array.from({ length: 3 }).map((_, i) => ({ id: `s-m-${i}`, isSkeleton: true })) },
         { title: "Finishers", players: Array.from({ length: 2 }).map((_, i) => ({ id: `s-f-${i}`, isSkeleton: true })) },
         { title: "Bowlers", players: Array.from({ length: 4 }).map((_, i) => ({ id: `s-b-${i}`, isSkeleton: true })) },
       ];
     }

     const players = squad.slice(0, 15); // Take top 15 to find a good XI
     const openers = players.filter(p => isBatterRole(p.role)).slice(0, 2);
     const seen = new Set(openers.map(p => p.id));
     
     const remaining = players.filter(p => !seen.has(p.id));
     const middle = remaining.filter(p => isBatterRole(p.role)).slice(0, 3);
     middle.forEach(p => seen.add(p.id));
     
     const remaining2 = players.filter(p => !seen.has(p.id));
     const finishers = remaining2.filter(p => /all.?rounder|wk/i.test(p.role)).slice(0, 2);
     finishers.forEach(p => seen.add(p.id));
     
     const remaining3 = players.filter(p => !seen.has(p.id));
     const bowlers = remaining3.filter(p => /bowler|all.?rounder/i.test(p.role)).slice(0, 4);
     
     return [
       { title: "Openers", players: openers },
       { title: "Middle Order", players: middle },
       { title: "Finishers", players: finishers },
       { title: "Bowlers", players: bowlers },
     ];
   };

  const groups1 = buildGroups(squad1);
  const groups2 = buildGroups(squad2);

  const TeamBlock = ({ team, groups }: { team: string; groups: any[] }) => (
    <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/[0.02] p-8">
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5 blur-3xl" />
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-3 w-3 rounded-full bg-sky-500 shadow-[0_0_15px_rgba(14,165,233,0.5)]" />
          <h3 className="text-2xl font-black text-white">{team}</h3>
        </div>
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Probable XI</span>
      </div>
      
      <div className="space-y-8">
        {groups.map((group) => group.players.length > 0 && (
          <div key={group.title}>
            <h4 className="mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">{group.title}</h4>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {group.players.map((player) => (
                <div key={player.id} className="group flex flex-col items-center rounded-2xl border border-white/5 bg-white/[0.03] p-4 transition-all hover:bg-white/[0.06] hover:border-white/10">
                  <div className="relative mb-3 h-20 w-20 overflow-hidden rounded-full border-2 border-white/10 bg-white/10 group-hover:border-sky-500/50 transition-colors">
                    {player.isSkeleton ? (
                      <Skeleton className="h-full w-full" />
                    ) : (
                      <ImageWithFallback
                        src={getPlayerImageUrl(player.name)}
                        alt={player.name}
                        fallbackMode="person"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    )}
                  </div>
                  {player.isSkeleton ? (
                    <>
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="mt-2 h-2 w-12" />
                    </>
                  ) : (
                    <>
                      <p className="w-full truncate text-center text-xs font-black text-white">{player.name}</p>
                      <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-white/30">{player.role || "Player"}</p>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <TeamBlock team={team1} groups={groups1} />
      <TeamBlock team={team2} groups={groups2} />
    </div>
  );
});

export const CurrentPlayersCard = memo(function CurrentPlayersCard({
  batters,
  bowler,
  overBalls = [],
  loading,
}: {
  batters: LiveBatter[];
  bowler: LiveBowler | null;
  overBalls?: string[];
  loading?: boolean;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.02] p-6">
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-sky-500/5 blur-3xl" />
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-sky-500" />
            <h3 className="text-lg font-black text-white">Current Batters</h3>
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Live</span>
        </div>
        <div className="grid gap-4">
          {loading &&
            Array.from({ length: 2 }).map((_, index) => <Skeleton key={index} className="h-24 rounded-2xl" />)}
          {!loading && batters.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-10">
              <p className="text-xs font-bold text-white/20 uppercase tracking-widest">No Batters Active</p>
            </div>
          )}
          {!loading && batters.map((batter, index) => <BatsmanLiveRow key={`${batter.name}-${index}`} batter={batter} />)}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.02] p-6">
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-rose-500/5 blur-3xl" />
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-rose-500" />
            <h3 className="text-lg font-black text-white">Current Bowler</h3>
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Live</span>
        </div>
        {loading ? (
          <Skeleton className="h-32 rounded-2xl" />
        ) : !bowler ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-10">
            <p className="text-xs font-bold text-white/20 uppercase tracking-widest">No Bowler Active</p>
          </div>
        ) : (
          <BowlerLiveRow bowler={bowler} overBalls={overBalls} />
        )}
      </div>
    </div>
  );
});

function TableFallback({ label }: { label: string }) {
  return <div className="px-4 py-5 text-sm text-white/45">{label}</div>;
}

export const ScorecardInningsCard = memo(function ScorecardInningsCard({
  inning,
}: {
  inning: ScorecardInnings;
}) {
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.02]">
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
      <div className="flex flex-wrap items-center justify-between gap-6 border-b border-white/5 px-8 py-6 bg-white/[0.02]">
        <div className="flex items-center gap-4">
          <div className="h-3 w-3 rounded-full bg-sky-500 shadow-[0_0_15px_rgba(14,165,233,0.5)]" />
          <div>
            <h3 className="text-xl font-black text-white">{inning.title}</h3>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">{inning.team}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-white">{inning.score}</p>
          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">{inning.overs} Overs</p>
        </div>
      </div>

      <div className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-white/[0.03]">
              <TableRow className="border-none hover:bg-transparent">
                <TableHead className="w-16"></TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Batting</TableHead>
                <TableHead className="text-right text-[10px] font-black uppercase tracking-[0.2em] text-white/20">R</TableHead>
                <TableHead className="text-right text-[10px] font-black uppercase tracking-[0.2em] text-white/20">B</TableHead>
                <TableHead className="text-right text-[10px] font-black uppercase tracking-[0.2em] text-white/20">4s</TableHead>
                <TableHead className="text-right text-[10px] font-black uppercase tracking-[0.2em] text-white/20">6s</TableHead>
                <TableHead className="text-right text-[10px] font-black uppercase tracking-[0.2em] text-white/20">SR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inning.batting.map((batter, idx) => (
                <TableRow key={`${batter.name}-${idx}`} className="border-white/5 hover:bg-white/[0.04] transition-colors">
                  <TableCell className="py-3 pl-8">
                    <div className="h-12 w-12 overflow-hidden rounded-full border-2 border-white/10 bg-white/10 shadow-xl transition-transform hover:scale-110">
                      <ImageWithFallback
                        src={getPlayerImageUrl(batter.name)}
                        alt={batter.name}
                        fallbackMode="person"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="py-3">
                    <p className="text-sm font-black text-white">{batter.name}</p>
                    <p className="text-[10px] font-bold text-white/30">{batter.dismissal}</p>
                  </TableCell>
                  <TableCell className="py-3 text-right font-black text-sky-400">{batter.runs}</TableCell>
                  <TableCell className="py-3 text-right text-sm font-bold text-white/50">{batter.balls}</TableCell>
                  <TableCell className="py-3 text-right text-sm font-bold text-white/50">{batter.fours}</TableCell>
                  <TableCell className="py-3 text-right text-sm font-bold text-white/50">{batter.sixes}</TableCell>
                  <TableCell className="py-3 pr-8 text-right text-sm font-bold text-white/50">{batter.strikeRate}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 overflow-x-auto border-t border-white/5">
          <Table>
            <TableHeader className="bg-white/[0.03]">
              <TableRow className="border-none hover:bg-transparent">
                <TableHead className="w-16"></TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Bowling</TableHead>
                <TableHead className="text-right text-[10px] font-black uppercase tracking-[0.2em] text-white/20">O</TableHead>
                <TableHead className="text-right text-[10px] font-black uppercase tracking-[0.2em] text-white/20">M</TableHead>
                <TableHead className="text-right text-[10px] font-black uppercase tracking-[0.2em] text-white/20">R</TableHead>
                <TableHead className="text-right text-[10px] font-black uppercase tracking-[0.2em] text-white/20">W</TableHead>
                <TableHead className="text-right text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Econ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inning.bowling.map((bowler, idx) => (
                <TableRow key={`${bowler.name}-${idx}`} className="border-white/5 hover:bg-white/[0.04] transition-colors">
                  <TableCell className="py-3 pl-8">
                    <div className="h-12 w-12 overflow-hidden rounded-full border-2 border-white/10 bg-white/10 shadow-xl transition-transform hover:scale-110">
                      <ImageWithFallback
                        src={getPlayerImageUrl(bowler.name)}
                        alt={bowler.name}
                        fallbackMode="person"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="py-3">
                    <p className="text-sm font-black text-white">{bowler.name}</p>
                  </TableCell>
                  <TableCell className="py-3 text-right text-sm font-bold text-white/50">{bowler.overs}</TableCell>
                  <TableCell className="py-3 text-right text-sm font-bold text-white/50">{bowler.maidens}</TableCell>
                  <TableCell className="py-3 text-right text-sm font-bold text-white/50">{bowler.runs}</TableCell>
                  <TableCell className="py-3 text-right font-black text-rose-400">{bowler.wickets}</TableCell>
                  <TableCell className="py-3 pr-8 text-right text-sm font-bold text-white/50">{bowler.economy}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
});
