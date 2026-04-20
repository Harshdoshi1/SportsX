import { Router } from "express";
import { teamsController } from "../controllers/teamsController.js";

const router = Router();

router.get("/", teamsController.getTeams);
router.get("/:id/players", teamsController.getPlayersByTeam);

export default router;
