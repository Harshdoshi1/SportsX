import { createBrowserRouter } from "react-router";
import { Root } from "./components/Root";
import { Splash } from "./components/pages/Splash";
import { Login } from "./components/pages/Login";
import { Dashboard } from "./components/pages/Dashboard";
import { SportPage } from "./components/pages/SportPage";
import { League } from "./components/pages/League";
import { MatchDetails } from "./components/pages/MatchDetails";
import { Analytics } from "./components/pages/Analytics";
import { LiveRoom } from "./components/pages/LiveRoom";
import { Profile } from "./components/pages/Profile";
import { TeamAnalysis } from "./components/pages/TeamAnalysis";
import { PlayerAnalysis } from "./components/pages/PlayerAnalysis";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: Splash },
      { path: "login", Component: Login },
      { path: "dashboard", Component: Dashboard },
      // Full navigation flow: Sport → League → Team → Player
      { path: "sport/:sportId", Component: SportPage },
      { path: "sport/:sportId/league/:leagueId", Component: League },
      { path: "sport/:sportId/league/:leagueId/team/:teamId", Component: TeamAnalysis },
      { path: "sport/:sportId/league/:leagueId/team/:teamId/player/:playerId", Component: PlayerAnalysis },
      // Legacy routes (keep for backward compatibility)
      { path: "league/:leagueId", Component: League },
      { path: "team/:teamId", Component: TeamAnalysis },
      { path: "player/:playerId", Component: PlayerAnalysis },
      // Other pages
      { path: "match/:matchId", Component: MatchDetails },
      { path: "analytics", Component: Analytics },
      { path: "live-room/:matchId", Component: LiveRoom },
      { path: "profile", Component: Profile },
    ],
  },
]);
