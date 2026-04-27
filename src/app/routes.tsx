import { createBrowserRouter, Navigate } from "react-router";
import { Root } from "./components/Root";
import { Splash } from "./components/pages/Splash";
import { Login } from "./components/pages/Login";
import { Dashboard } from "./components/pages/Dashboard";
import { AdminDashboard } from "./components/pages/AdminDashboard";
import { SportPage } from "./components/pages/SportPage";
import { League } from "./components/pages/League";
import { MatchDetails } from "./components/pages/MatchDetails";
import { Analytics } from "./components/pages/Analytics";
import { LiveRoom } from "./components/pages/LiveRoom";
import { Profile } from "./components/pages/Profile";
import { TeamAnalysis } from "./components/pages/TeamAnalysis";
import { PlayerAnalysis } from "./components/pages/PlayerAnalysis";
import { MatchLounge } from "./components/pages/MatchLounge";
import { LoungeRoom } from "./components/pages/LoungeRoom";
import { useAdmin } from "../contexts/AdminContext";

function AdminOnly({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAdmin();
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

function AdminDashboardRoute() {
  return (
    <AdminOnly>
      <AdminDashboard />
    </AdminOnly>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: Splash },
      { path: "login", Component: Login },
      { path: "dashboard", Component: Dashboard },
      { path: "admin/dashboard", Component: AdminDashboardRoute },
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
      // Lounge system
      { path: "lounge/:matchId", Component: MatchLounge },
      { path: "lounge/:matchId/room/:roomId", Component: LoungeRoom },
      { path: "profile", Component: Profile },
    ],
  },
]);
