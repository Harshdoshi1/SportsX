import { motion } from "motion/react";
import type { TeamRef } from "../sportTypes";

interface TeamRefLogoProps {
  team: TeamRef;
  size?: number;
  className?: string;
}

export function TeamRefLogo({ team, size = 40, className }: TeamRefLogoProps) {
  const color = team.primaryColor || "rgba(255,255,255,0.25)";
  const label = team.shortName || team.name.substring(0, 3).toUpperCase();

  if (team.logoUrl) {
    return (
      <div
        className={className}
        style={{
          width: size, height: size, borderRadius: size,
          border: `2px solid ${color}`,
          background: "rgba(255,255,255,0.92)",
          boxShadow: "0 8px 20px rgba(0,0,0,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
          overflow: "hidden", flexShrink: 0,
        }}
      >
        <img src={team.logoUrl} alt={`${team.name} logo`} style={{ width: "85%", height: "85%", objectFit: "contain" }} />
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        width: size, height: size, borderRadius: size,
        background: `linear-gradient(135deg, ${color}40, ${color}20)`,
        border: `2px solid ${color}60`,
        boxShadow: `0 8px 20px ${color}20`,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: Math.max(9, Math.floor(size * 0.26)), fontWeight: 800, color: "white", letterSpacing: "0.5px" }}>
        {label}
      </span>
    </div>
  );
}
