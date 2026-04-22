import { iplPlayerProfileService } from "./iplPlayerProfileService.js";
import { iplTeamPlayersService } from "./iplTeamPlayersService.js";
import { supabaseIplSyncService } from "./supabaseIplSyncService.js";
import { env } from "../config/env.js";

let timer = null;
let lastTeamRefreshAt = 0;
let lastHeartbeatAt = 0;

const runRefresh = async () => {
  try {
    const syncSummary = await supabaseIplSyncService.syncAllFeeds(false);

    const now = Date.now();
    if (now - lastTeamRefreshAt >= env.teamSyncIntervalMs) {
      const [linkedProfiles, teamRefresh] = await Promise.all([
        iplPlayerProfileService.refreshProvidedPlayerProfiles(),
        iplTeamPlayersService.refreshAllTeams(),
      ]);

      await supabaseIplSyncService.syncTeamPlayers(true);
      lastTeamRefreshAt = now;

      // eslint-disable-next-line no-console
      console.log(
        `[player-profile-scheduler] linked profiles=${linkedProfiles.count}${linkedProfiles.changed ? " (changed)" : ""}, teams=${teamRefresh.totalTeams}${teamRefresh.changedTeams > 0 ? ` (${teamRefresh.changedTeams} changed)` : ""}`,
      );
    }

    if (now - lastHeartbeatAt >= env.heartbeatIntervalMs) {
      await supabaseIplSyncService.performDailyHeartbeat();
      lastHeartbeatAt = now;
    }

    // eslint-disable-next-line no-console
    console.log(
      `[supabase-sync] enabled=${syncSummary.enabled} feeds=${(syncSummary.results || [])
        .map((row) => `${row.feedKey}:${row.changed ? "updated" : "same"}`)
        .join(", ")}`,
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn("[player-profile-scheduler] refresh failed", error?.message || error);
  }
};

export const playerProfileScheduler = {
  start() {
    if (timer) {
      return;
    }

    // Warm once on startup, then check every 5 minutes.
    runRefresh();
    timer = setInterval(runRefresh, env.syncIntervalMs);
  },

  stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  },
};
