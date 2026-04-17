export type IplTeamId = "rcb" | "mi" | "csk" | "kkr" | "dc" | "srh" | "pbks" | "rr" | "gt" | "lsg";

export type IplTeamMeta = {
  id: IplTeamId;
  short: string;
  name: string;
  color: string;
  logoPath: string;
};

export const IPL_TEAMS: Record<IplTeamId, IplTeamMeta> = {
  rcb: { id: "rcb", short: "RCB", name: "Royal Challengers Bengaluru", color: "#d8b24f", logoPath: "/assets/teams/rcb.png" },
  mi: { id: "mi", short: "MI", name: "Mumbai Indians", color: "#2b6ed2", logoPath: "/assets/teams/mi.png" },
  csk: { id: "csk", short: "CSK", name: "Chennai Super Kings", color: "#ff9d32", logoPath: "/assets/teams/csk.png" },
  kkr: { id: "kkr", short: "KKR", name: "Kolkata Knight Riders", color: "#6d43b5", logoPath: "/assets/teams/kkr.png" },
  dc: { id: "dc", short: "DC", name: "Delhi Capitals", color: "#3b76c9", logoPath: "/assets/teams/dc.png" },
  srh: { id: "srh", short: "SRH", name: "Sunrisers Hyderabad", color: "#f36c2f", logoPath: "/assets/teams/srh.png" },
  pbks: { id: "pbks", short: "PBKS", name: "Punjab Kings", color: "#df3d4e", logoPath: "/assets/teams/pbks.png" },
  rr: { id: "rr", short: "RR", name: "Rajasthan Royals", color: "#c04fb9", logoPath: "/assets/teams/rr.png" },
  gt: { id: "gt", short: "GT", name: "Gujarat Titans", color: "#3a68c5", logoPath: "/assets/teams/gt.png" },
  lsg: { id: "lsg", short: "LSG", name: "Lucknow Super Giants", color: "#c58b35", logoPath: "/assets/teams/lsg.png" },
};

const SHORT_TO_ID: Record<string, IplTeamId> = {
  RCB: "rcb",
  MI: "mi",
  CSK: "csk",
  KKR: "kkr",
  DC: "dc",
  SRH: "srh",
  PBKS: "pbks",
  RR: "rr",
  GT: "gt",
  LSG: "lsg",
};

export function getIplTeamByShort(short: string) {
  const id = SHORT_TO_ID[short.toUpperCase()];
  return id ? IPL_TEAMS[id] : null;
}

export function getIplTeamById(id?: string) {
  if (!id) return null;
  const lowered = id.toLowerCase() as IplTeamId;
  return IPL_TEAMS[lowered] ?? null;
}
