import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { MatchDetails } from "./MatchDetails";
import { MatchDetailsNew } from "./MatchDetailsNew";

/**
 * Router component that decides which match details component to use
 * based on whether the match is an admin match or a regular match.
 */
export function MatchDetailsRouter() {
  const { matchId } = useParams<{ matchId: string }>();
  const [isAdminMatch, setIsAdminMatch] = useState<boolean | null>(null);

  useEffect(() => {
    if (!matchId) {
      setIsAdminMatch(false);
      return;
    }

    // Check if this is an admin match by trying to fetch from admin API
    const checkIfAdminMatch = async () => {
      try {
        const response = await fetch(`/api/admin/matches/${matchId}`);
        if (response.ok) {
          setIsAdminMatch(true);
        } else {
          setIsAdminMatch(false);
        }
      } catch (error) {
        setIsAdminMatch(false);
      }
    };

    checkIfAdminMatch();
  }, [matchId]);

  // Show loading while checking
  if (isAdminMatch === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  // Route to appropriate component
  if (isAdminMatch) {
    return <MatchDetailsNew />;
  }

  return <MatchDetails />;
}
