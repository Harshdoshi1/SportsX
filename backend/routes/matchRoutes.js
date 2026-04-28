import { Router } from "express";
import { matchesController } from "../controllers/matchesController.js";

const router = Router();

router.get("/:id", matchesController.getMatchDetails);

export default router;
