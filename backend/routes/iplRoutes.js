import { Router } from "express";
import { iplController } from "../controllers/iplController.js";

const router = Router();

router.get("/points", iplController.getPoints);
router.get("/matches", iplController.getMatches);

export default router;
