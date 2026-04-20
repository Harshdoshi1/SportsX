import { Router } from "express";
import { iplController } from "../controllers/iplController.js";

const router = Router();

router.get("/points", iplController.getPoints);
router.get("/matches", iplController.getMatches);
router.get("/stats", iplController.getStats);
router.get("/squads", iplController.getSquads);
router.get("/news", iplController.getNews);

export default router;
