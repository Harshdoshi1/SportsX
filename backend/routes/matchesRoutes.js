import { Router } from "express";
import { matchesController } from "../controllers/matchesController.js";

const router = Router();

router.get("/live", matchesController.getLive);
router.get("/upcoming", matchesController.getUpcoming);
router.get("/recent", matchesController.getRecent);
router.get("/ipl", matchesController.getIpl);

export default router;
