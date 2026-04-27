import { Router } from "express";
import { playerController } from "../controllers/playerController.js";

const router = Router();

router.get("/list", playerController.getPlayerList);
router.get("/image", playerController.resolvePlayerImage);
router.get("/innings/:playerId", playerController.getPlayerInnings);
router.get("/opponent-analysis/:playerId", playerController.getPlayerOpponentAnalysis);
router.post("/refresh", playerController.refreshPlayerData);

export default router;
