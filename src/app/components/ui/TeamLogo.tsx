import { useMemo, useState } from "react";
import { getIplTeamById, getIplTeamByShort } from "../../data/iplTeams";

type TeamLogoProps = {
  teamId?: string;
  short?: string;
  size?: number;
  className?: string;
};

export function TeamLogo({ teamId, short, size = 40, className }: TeamLogoProps) {
  const [errored, setErrored] = useState(false);
  const team = useMemo(() => {
    if (teamId) return getIplTeamById(teamId);
    if (short) return getIplTeamByShort(short);
    return null;
  }, [teamId, short]);

  const label = (short || team?.short || "?").toUpperCase();
  const borderColor = team?.color || "rgba(255,255,255,0.25)";

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: size,
        border: `2px solid ${borderColor}`,
        background: "rgba(255,255,255,0.92)",
        boxShadow: "0 10px 24px rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        flexShrink: 0,
      }}
      aria-label={`${label} logo`}
    >
      {team?.logoPath && !errored ? (
        <img
          src={team.logoPath}
          alt={`${label} logo`}
          onError={() => setErrored(true)}
          style={{ width: "88%", height: "88%", objectFit: "contain" }}
        />
      ) : (
        <span style={{ fontSize: Math.max(10, Math.floor(size * 0.28)), fontWeight: 800, color: "#10142a" }}>{label}</span>
      )}
    </div>
  );
}
