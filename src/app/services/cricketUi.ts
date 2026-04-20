import { getIplTeamByShort } from "../data/iplTeams";

const IPL_NAME_TO_SHORT: Record<string, string> = {
  mi: "MI",
  csk: "CSK",
  rcb: "RCB",
  kkr: "KKR",
  dc: "DC",
  srh: "SRH",
  pbks: "PBKS",
  rr: "RR",
  gt: "GT",
  lsg: "LSG",
  "mumbai indians": "MI",
  "chennai super kings": "CSK",
  "royal challengers bengaluru": "RCB",
  "royal challengers bangalore": "RCB",
  "kolkata knight riders": "KKR",
  "delhi capitals": "DC",
  "sunrisers hyderabad": "SRH",
  "punjab kings": "PBKS",
  "rajasthan royals": "RR",
  "gujarat titans": "GT",
  "lucknow super giants": "LSG",
};

const SHORT_TO_TEAM_ID: Record<string, string> = {
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

export const normalizeText = (value?: string | null) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export const safeArray = <T>(value: unknown): T[] => {
  if (Array.isArray(value)) {
    return value as T[];
  }
  return [];
};

export const deriveTeamShort = (teamName?: string | null): string => {
  if (!teamName) {
    return "TBD";
  }

  const normalized = normalizeText(teamName);
  if (IPL_NAME_TO_SHORT[normalized]) {
    return IPL_NAME_TO_SHORT[normalized];
  }

  const words = teamName
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase())
    .filter(Boolean);

  return words.slice(0, 4).join("") || "TBD";
};

export const getTeamLogoProps = (teamName?: string | null) => {
  const short = deriveTeamShort(teamName);
  const teamId = SHORT_TO_TEAM_ID[short];

  if (teamId && getIplTeamByShort(short)) {
    return { teamId, short };
  }

  return { short };
};

export const isIplTeamName = (teamName?: string | null) => {
  const normalized = normalizeText(teamName);
  return Boolean(IPL_NAME_TO_SHORT[normalized]);
};

export const formatApiDate = (dateValue?: string | number | null) => {
  if (!dateValue) {
    return "TBD";
  }

  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) {
    return String(dateValue);
  }

  return parsed.toLocaleString();
};

export const isCompletedStatus = (status?: string | null) =>
  /(won|match over|result|completed|ended|beat|no result|draw|stumps)/i.test(String(status || ""));

export const isUpcomingStatus = (status?: string | null) =>
  /(upcoming|starts|yet to|scheduled|not started|fixture|toss)/i.test(String(status || ""));

export const isLiveStatus = (status?: string | null) =>
  /(live|in progress|innings break|break|playing)/i.test(String(status || ""));

export const slugify = (value?: string | null) =>
  normalizeText(value)
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "");
