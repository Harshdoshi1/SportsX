import { Router } from "express";
import iplRoutes from "./iplRoutes.js";
import matchRoutes from "./matchRoutes.js";
import matchesRoutes from "./matchesRoutes.js";
import playerRoutes from "./playerRoutes.js";
import searchRoutes from "./searchRoutes.js";
import seriesRoutes from "./seriesRoutes.js";
import teamsRoutes from "./teamsRoutes.js";
import { teamsController } from "../controllers/teamsController.js";
import { supabaseIplSyncService } from "../services/supabaseIplSyncService.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.status(200).json({ success: true, status: "ok" });
});

router.get("/health/sync", async (_req, res) => {
  const status = await supabaseIplSyncService.getSyncStatus();
  res.status(200).json({ success: true, status: "ok", data: status });
});

router.post("/health/sync/run", async (_req, res) => {
  try {
    const result = await supabaseIplSyncService.forceBackfillNow();
    const status = await supabaseIplSyncService.getSyncStatus();
    res.status(200).json({ success: true, data: { result, status } });
  } catch (error) {
    if (String(error?.message || "").startsWith("[supabase-config]")) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: error?.message || "sync run failed",
    });
  }
});

router.use("/matches", matchesRoutes);
router.use("/match", matchRoutes);
router.use("/teams", teamsRoutes);
router.get("/team/:id/players", teamsController.getPlayersByTeam);
router.use("/series", seriesRoutes);
router.use("/search", searchRoutes);
router.use("/players", playerRoutes);
router.use("/ipl", iplRoutes);

export default router;
