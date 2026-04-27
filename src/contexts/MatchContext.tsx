import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { cricketApi } from "../app/services/cricketApi";

export type SportKey = "cricket" | "football" | "basketball" | "tennis" | "other";

export type SportCategory =
  | "Cricket > IPL"
  | "Cricket > ICC"
  | "Cricket > Other"
  | "Football"
  | "Basketball"
  | "Tennis"
  | "Other";

export type AdminMatchType = "upcoming" | "live" | "ended";

export type AdminMatchBase = {
  id: string;
  type: AdminMatchType;
  createdAt: string;
  updatedAt: string;
  sourceUrl: string;
  sport: SportKey;
  category: SportCategory;
  sectionLabel: string;
  matchTitle: string;
};

export type AdminUpcomingMatch = AdminMatchBase & {
  type: "upcoming";
  scheduledAtIso: string;
  liveSourceUrl?: string | null;
};

export type AdminLiveMatch = AdminMatchBase & {
  type: "live";
};

export type AdminEndedMatch = AdminMatchBase & {
  type: "ended";
  finalResultText: string;
  playerOfMatch?: string | null;
  finalTeam1Score?: string | null;
  finalTeam2Score?: string | null;
};

export type AdminMatch = AdminUpcomingMatch | AdminLiveMatch | AdminEndedMatch;

type LiveSnapshot = {
  match: any | null;
  scoreboard: any | null;
  fetchedAtIso: string;
  stale?: boolean;
};

type MatchState = {
  adminMatches: AdminMatch[];
  liveSnapshotsByMatchId: Record<string, LiveSnapshot | undefined>;
  connectionLostByMatchId: Record<string, boolean | undefined>;
};

type AddUpcomingInput = {
  sourceUrl: string;
  sport: SportKey;
  category: SportCategory;
  sectionLabel: string;
  matchTitle: string;
  scheduledAtIso: string;
};

type AddLiveInput = Omit<AddUpcomingInput, "scheduledAtIso">;

type MatchContextValue = MatchState & {
  addUpcomingMatch: (input: AddUpcomingInput) => AdminUpcomingMatch;
  addLiveMatch: (input: AddLiveInput) => AdminLiveMatch;
  removeAdminMatch: (id: string) => void;
  setUpcomingLiveUrl: (id: string, liveSourceUrl: string) => void;
  promoteUpcomingToLive: (id: string) => void;
  markMatchEnded: (id: string, result: Omit<AdminEndedMatch, "id" | "createdAt" | "updatedAt" | "sourceUrl" | "sport" | "category" | "sectionLabel" | "matchTitle"> & { finalResultText: string }) => void;
  setLiveSnapshot: (id: string, snapshot: LiveSnapshot) => void;
  setConnectionLost: (id: string, value: boolean) => void;
};

const STORAGE_KEY = "sportsx-admin-matches-v1";

const MatchContext = createContext<MatchContextValue | undefined>(undefined);

const nowIso = () => new Date().toISOString();

const randomId = () => {
  const rand = Math.random().toString(16).slice(2, 10);
  return `admin-${Date.now()}-${rand}`;
};

const safeJsonParse = <T,>(value: string | null): T | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

const toSportKey = (category: SportCategory): SportKey => {
  if (category.startsWith("Cricket")) return "cricket";
  if (category === "Football") return "football";
  if (category === "Basketball") return "basketball";
  if (category === "Tennis") return "tennis";
  return "other";
};

const guessTournamentId = (category: SportCategory): string => {
  if (category === "Cricket > IPL") return "ipl";
  if (category === "Cricket > ICC") return "icc";
  return "admin";
};

const looksLive = (payload: any): boolean => {
  const status = String(payload?.match?.status || "").toLowerCase();
  if (/(live|in progress|innings break)/.test(status)) return true;
  const innings = payload?.scoreboard?.innings;
  const hasInnings = Array.isArray(innings) && innings.length > 0 && Boolean(innings[0]?.score);
  const hasBatters = Array.isArray(payload?.scoreboard?.batters) && payload.scoreboard.batters.length > 0;
  return Boolean(hasInnings || hasBatters);
};

const detectEnded = (payload: any): { ended: boolean; resultText: string | null } => {
  const status = String(payload?.match?.status || "").toLowerCase();
  const result = String(payload?.match?.result || "").trim();
  if (/(won|result|match over|innings complete|completed)/.test(status) || /(won|result)/i.test(result)) {
    return { ended: true, resultText: result || payload?.match?.status || null };
  }
  return { ended: false, resultText: null };
};

export function MatchProvider({ children }: { children: React.ReactNode }) {
  const [adminMatches, setAdminMatches] = useState<AdminMatch[]>(() => {
    const parsed = safeJsonParse<AdminMatch[]>(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(parsed) ? parsed : [];
  });
  const [liveSnapshotsByMatchId, setLiveSnapshotsByMatchId] = useState<Record<string, LiveSnapshot | undefined>>({});
  const [connectionLostByMatchId, setConnectionLostByMatchId] = useState<Record<string, boolean | undefined>>({});

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(adminMatches));
  }, [adminMatches]);

  const addUpcomingMatch = (input: AddUpcomingInput): AdminUpcomingMatch => {
    const createdAt = nowIso();
    const match: AdminUpcomingMatch = {
      id: randomId(),
      type: "upcoming",
      createdAt,
      updatedAt: createdAt,
      sourceUrl: input.sourceUrl,
      sport: input.sport,
      category: input.category,
      sectionLabel: input.sectionLabel,
      matchTitle: input.matchTitle,
      scheduledAtIso: input.scheduledAtIso,
      liveSourceUrl: null,
    };
    setAdminMatches((prev) => [match, ...prev]);
    return match;
  };

  const addLiveMatch = (input: AddLiveInput): AdminLiveMatch => {
    const createdAt = nowIso();
    const match: AdminLiveMatch = {
      id: randomId(),
      type: "live",
      createdAt,
      updatedAt: createdAt,
      sourceUrl: input.sourceUrl,
      sport: input.sport,
      category: input.category,
      sectionLabel: input.sectionLabel,
      matchTitle: input.matchTitle,
    };
    setAdminMatches((prev) => [match, ...prev]);
    return match;
  };

  const removeAdminMatch = (id: string) => {
    setAdminMatches((prev) => prev.filter((m) => m.id !== id));
    setLiveSnapshotsByMatchId((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setConnectionLostByMatchId((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const setUpcomingLiveUrl = (id: string, liveSourceUrl: string) => {
    const url = String(liveSourceUrl || "").trim();
    if (!url) return;
    setAdminMatches((prev) =>
      prev.map((m) =>
        m.id === id && m.type === "upcoming"
          ? ({ ...m, liveSourceUrl: url, updatedAt: nowIso() } as AdminUpcomingMatch)
          : m,
      ),
    );
  };

  const promoteUpcomingToLive = (id: string) => {
    setAdminMatches((prev) =>
      prev.map((m) => {
        if (m.id !== id || m.type !== "upcoming") return m;
        const nextUrl = String((m as AdminUpcomingMatch).liveSourceUrl || m.sourceUrl || "").trim() || m.sourceUrl;
        const promoted: AdminLiveMatch = {
          ...m,
          type: "live",
          sourceUrl: nextUrl,
          updatedAt: nowIso(),
        };
        return promoted;
      }),
    );
  };

  const markMatchEnded: MatchContextValue["markMatchEnded"] = (id, result) => {
    setAdminMatches((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        const ended: AdminEndedMatch = {
          ...m,
          type: "ended",
          updatedAt: nowIso(),
          finalResultText: result.finalResultText,
          playerOfMatch: (result as any).playerOfMatch ?? null,
          finalTeam1Score: (result as any).finalTeam1Score ?? null,
          finalTeam2Score: (result as any).finalTeam2Score ?? null,
        };
        return ended;
      }),
    );
  };

  const setLiveSnapshot = (id: string, snapshot: LiveSnapshot) => {
    setLiveSnapshotsByMatchId((prev) => ({ ...prev, [id]: snapshot }));
  };

  const setConnectionLost = (id: string, value: boolean) => {
    setConnectionLostByMatchId((prev) => ({ ...prev, [id]: value }));
  };

  const value = useMemo<MatchContextValue>(
    () => ({
      adminMatches,
      liveSnapshotsByMatchId,
      connectionLostByMatchId,
      addUpcomingMatch,
      addLiveMatch,
      removeAdminMatch,
      setUpcomingLiveUrl,
      promoteUpcomingToLive,
      markMatchEnded,
      setLiveSnapshot,
      setConnectionLost,
    }),
    [adminMatches, liveSnapshotsByMatchId, connectionLostByMatchId],
  );

  return <MatchContext.Provider value={value}>{children}</MatchContext.Provider>;
}

export function useMatchStore() {
  const ctx = useContext(MatchContext);
  if (!ctx) throw new Error("useMatchStore must be used within a MatchProvider");
  return ctx;
}

export function useAdminMatchPolling() {
  const {
    adminMatches,
    promoteUpcomingToLive,
    markMatchEnded,
    setLiveSnapshot,
    setConnectionLost,
  } = useMatchStore();

  const consecutiveFailByIdRef = useRef<Record<string, number>>({});

  useEffect(() => {
    const liveMatches = adminMatches.filter((m) => m.type === "live");
    if (liveMatches.length === 0) return;

    let active = true;
    const controllers = new Map<string, AbortController>();

    const tick = async () => {
      if (!active) return;
      await Promise.all(
        liveMatches.map(async (m) => {
          const controller = new AbortController();
          controllers.get(m.id)?.abort();
          controllers.set(m.id, controller);

          try {
            const data: any = await cricketApi.getMatchDetailsByUrl(
              m.sourceUrl,
              true,
              controller.signal,
              { tournamentId: guessTournamentId(m.category), series: m.sectionLabel },
            );

            consecutiveFailByIdRef.current[m.id] = 0;
            setConnectionLost(m.id, false);
            setLiveSnapshot(m.id, {
              match: data?.match || null,
              scoreboard: data?.scoreboard || null,
              fetchedAtIso: nowIso(),
              stale: Boolean((data as any)?.meta?.stale),
            });

            const ended = detectEnded(data);
            if (ended.ended) {
              markMatchEnded(m.id, {
                finalResultText: ended.resultText || "Match ended",
                playerOfMatch: null,
                finalTeam1Score: String(data?.match?.team1Score || "") || null,
                finalTeam2Score: String(data?.match?.team2Score || "") || null,
              });
            }
          } catch (e) {
            const next = (consecutiveFailByIdRef.current[m.id] || 0) + 1;
            consecutiveFailByIdRef.current[m.id] = next;
            if (next >= 3) {
              setConnectionLost(m.id, true);
            }
          }
        }),
      );
    };

    tick();
    const handle = window.setInterval(tick, 1000);
    return () => {
      active = false;
      controllers.forEach((c) => c.abort());
      window.clearInterval(handle);
    };
  }, [adminMatches, markMatchEnded, setConnectionLost, setLiveSnapshot]);

  useEffect(() => {
    const upcoming = adminMatches.filter((m) => m.type === "upcoming");
    if (upcoming.length === 0) return;

    let active = true;
    const controllers = new Map<string, AbortController>();

    const tick = async () => {
      if (!active) return;
      await Promise.all(
        upcoming.map(async (m) => {
          const url = String((m as AdminUpcomingMatch).liveSourceUrl || m.sourceUrl || "").trim() || m.sourceUrl;
          const controller = new AbortController();
          controllers.get(m.id)?.abort();
          controllers.set(m.id, controller);

          try {
            const data: any = await cricketApi.getMatchDetailsByUrl(
              url,
              true,
              controller.signal,
              { tournamentId: guessTournamentId(m.category), series: m.sectionLabel },
            );
            if (looksLive(data)) {
              promoteUpcomingToLive(m.id);
              setLiveSnapshot(m.id, {
                match: data?.match || null,
                scoreboard: data?.scoreboard || null,
                fetchedAtIso: nowIso(),
                stale: Boolean((data as any)?.meta?.stale),
              });
            }
          } catch {
            // Upcoming detection should be silent; it'll retry.
          }
        }),
      );
    };

    tick();
    const handle = window.setInterval(tick, 60_000);
    return () => {
      active = false;
      controllers.forEach((c) => c.abort());
      window.clearInterval(handle);
    };
  }, [adminMatches, promoteUpcomingToLive, setLiveSnapshot]);
}

export const SPORT_CATEGORY_OPTIONS: SportCategory[] = [
  "Cricket > IPL",
  "Cricket > ICC",
  "Cricket > Other",
  "Football",
  "Basketball",
  "Tennis",
  "Other",
];

export const sportKeyFromCategory = (category: SportCategory): SportKey => toSportKey(category);

