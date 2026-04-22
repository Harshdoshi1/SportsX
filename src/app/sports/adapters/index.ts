/* ─── Adapter Registry ─── */
import type { SportPageData } from "../sportTypes";
import { mapIccToSportPageData } from "./iccAdapter";
import { mapBblToSportPageData } from "./bblAdapter";
import { mapHundredToSportPageData } from "./hundredAdapter";
import { mapF1ToSportPageData } from "./f1Adapter";
import { mapNbaToSportPageData } from "./nbaAdapter";

type AdapterFn = () => Promise<SportPageData>;

const ADAPTER_MAP: Record<string, AdapterFn> = {
  // Cricket leagues
  wc: mapIccToSportPageData,
  icc: mapIccToSportPageData,
  bbl: mapBblToSportPageData,
  hundred: mapHundredToSportPageData,
  // F1
  "f1-2026": mapF1ToSportPageData,
  // Basketball
  nba: mapNbaToSportPageData,
};

/**
 * Get sport page data for any league ID.
 * Returns null if no adapter is registered for the given league.
 */
export async function getSportData(leagueId: string): Promise<SportPageData | null> {
  const adapter = ADAPTER_MAP[leagueId];
  if (!adapter) return null;
  return adapter();
}

/** Check if a league has a unified adapter (vs the old IPL-specific code) */
export function hasUnifiedAdapter(leagueId: string): boolean {
  return leagueId in ADAPTER_MAP;
}
