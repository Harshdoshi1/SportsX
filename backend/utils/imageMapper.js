import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { env } from "../config/env.js";

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".avif"]);

const TEAM_FILE_BY_NAME = {
  "mumbai indians": "mi.png",
  mi: "mi.png",
  "chennai super kings": "csk.png",
  csk: "csk.png",
  "royal challengers bengaluru": "rcb.png",
  "royal challengers bangalore": "rcb.png",
  rcb: "rcb.png",
  "kolkata knight riders": "kkr.png",
  kkr: "kkr.png",
  "delhi capitals": "dc.png",
  dc: "dc.png",
  "sunrisers hyderabad": "srh.png",
  srh: "srh.png",
  "punjab kings": "pbks.png",
  pbks: "pbks.png",
  "rajasthan royals": "rr.png",
  rr: "rr.png",
  "gujarat titans": "gt.png",
  gt: "gt.png",
  "lucknow super giants": "lsg.png",
  lsg: "lsg.png",
};

const normalize = (value = "") =>
  String(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const toSlug = (value = "") => normalize(value).replace(/\s+/g, "-");

const resolveTeamFileName = (teamName = "") => {
  const normalized = normalize(teamName);

  if (TEAM_FILE_BY_NAME[normalized]) {
    return TEAM_FILE_BY_NAME[normalized];
  }

  for (const [key, value] of Object.entries(TEAM_FILE_BY_NAME)) {
    if (key.length <= 4) {
      continue;
    }

    if (normalized.includes(key)) {
      return value;
    }
  }

  return null;
};

export const resolveTeamImage = (teamName) => {
  const fileName = resolveTeamFileName(teamName);
  if (!fileName) {
    return null;
  }

  const filePath = path.join(env.teamImageDir, fileName);
  if (!existsSync(filePath)) {
    return null;
  }

  return `${env.teamImageBaseUrl}/${fileName}`;
};

let playerIndexCache = null;
let playerIndexGeneratedAt = 0;

const walkFiles = (directoryPath, files = []) => {
  if (!existsSync(directoryPath)) {
    return files;
  }

  const entries = readdirSync(directoryPath);

  for (const entry of entries) {
    const fullPath = path.join(directoryPath, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      walkFiles(fullPath, files);
    } else {
      files.push(fullPath);
    }
  }

  return files;
};

const buildPlayerIndex = () => {
  const files = walkFiles(env.playerImageDir);
  const index = new Map();

  for (const file of files) {
    const extension = path.extname(file).toLowerCase();
    if (!IMAGE_EXTENSIONS.has(extension)) {
      continue;
    }

    const baseName = path.basename(file, extension);
    const slug = toSlug(baseName);

    const relativePath = path.relative(env.playerImageDir, file).split(path.sep).join("/");
    const imageUrl = `${env.playerImageBaseUrl}/${relativePath}`;

    index.set(slug, imageUrl);
    index.set(normalize(baseName), imageUrl);
  }

  playerIndexCache = index;
  playerIndexGeneratedAt = Date.now();
};

const shouldRefreshPlayerIndex = () => {
  const staleAfterMs = 10 * 60 * 1000;
  return !playerIndexCache || Date.now() - playerIndexGeneratedAt > staleAfterMs;
};

export const resolvePlayerImage = (playerName) => {
  if (!playerName) {
    return null;
  }

  if (shouldRefreshPlayerIndex()) {
    buildPlayerIndex();
  }

  const slug = toSlug(playerName.replace(/\(.*?\)/g, "").trim());
  const normalized = normalize(playerName.replace(/\(.*?\)/g, "").trim());

  return (
    playerIndexCache.get(slug) ||
    playerIndexCache.get(normalized) ||
    playerIndexCache.get(slug.replace(/-/g, " ")) ||
    null
  );
};
