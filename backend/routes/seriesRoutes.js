import { Router } from "express";
import { seriesController } from "../controllers/seriesController.js";

const router = Router();

router.get("/", seriesController.getAll);
router.get("/leagues", seriesController.getLeagues);
router.get("/ipl", seriesController.getIpl);

export default router;
