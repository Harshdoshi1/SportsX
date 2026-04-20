import { Router } from "express";
import iplRoutes from "./iplRoutes.js";
import matchRoutes from "./matchRoutes.js";
import matchesRoutes from "./matchesRoutes.js";
import searchRoutes from "./searchRoutes.js";
import seriesRoutes from "./seriesRoutes.js";
import teamsRoutes from "./teamsRoutes.js";
import { teamsController } from "../controllers/teamsController.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.status(200).json({ success: true, status: "ok" });
});

router.use("/matches", matchesRoutes);
router.use("/match", matchRoutes);
router.use("/teams", teamsRoutes);
router.get("/team/:id/players", teamsController.getPlayersByTeam);
router.use("/series", seriesRoutes);
router.use("/search", searchRoutes);
router.use("/ipl", iplRoutes);

export default router;
