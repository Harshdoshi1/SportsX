import { motion } from "motion/react";
import type { TeamRef } from "../sportTypes";
import { TeamRefLogo } from "./TeamRefLogo";
import { GlassCard } from "../../components/ui/GlassCard";

interface TeamGridProps {
  teams: TeamRef[];
  onTeamClick?: (team: TeamRef) => void;
}

export function TeamGrid({ teams, onTeamClick }: TeamGridProps) {
  if (teams.length === 0) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {teams.map((team, idx) => (
        <motion.div
          key={team.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: idx * 0.03 }}
        >
          <GlassCard
            className={`p-5 text-center ${onTeamClick ? "cursor-pointer" : ""}`}
            hover={!!onTeamClick}
            onClick={onTeamClick ? () => onTeamClick(team) : undefined}
          >
            <div className="flex justify-center mb-3">
              <TeamRefLogo team={team} size={52} />
            </div>
            <h4 className="text-white font-bold text-sm truncate">{team.name}</h4>
            <p className="text-white/35 text-xs mt-0.5">{team.shortName}</p>
            {team.primaryColor && (
              <div
                className="h-0.5 rounded-full mt-3 mx-auto"
                style={{ width: 32, background: team.primaryColor }}
              />
            )}
          </GlassCard>
        </motion.div>
      ))}
    </div>
  );
}
