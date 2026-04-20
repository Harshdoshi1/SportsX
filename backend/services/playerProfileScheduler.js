import { iplPlayerProfileService } from "./iplPlayerProfileService.js";
import { iplTeamPlayersService } from "./iplTeamPlayersService.js";

const ONE_HOUR_MS = 60 * 60 * 1000;
let timer = null;

const runRefresh = async () => {
  try {
    const [linkedProfiles, teamRefresh] = await Promise.all([
      iplPlayerProfileService.refreshProvidedPlayerProfiles(),
      iplTeamPlayersService.refreshAllTeams(),
    ]);
    // eslint-disable-next-line no-console
    console.log(
      `[player-profile-scheduler] linked profiles=${linkedProfiles.count}${linkedProfiles.changed ? " (changed)" : ""}, teams=${teamRefresh.totalTeams}${teamRefresh.changedTeams > 0 ? ` (${teamRefresh.changedTeams} changed)` : ""}`,
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

    // Warm once on startup, then refresh every 1 hour.
    runRefresh();
    timer = setInterval(runRefresh, ONE_HOUR_MS);
  },

  stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  },
};
