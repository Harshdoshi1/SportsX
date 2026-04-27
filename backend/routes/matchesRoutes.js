import { Router } from "express";
import { matchesController } from "../controllers/matchesController.js";

const router = Router();

router.post("/live-source", matchesController.setLiveSource);
router.get("/live", matchesController.getLive);
router.get("/icc-live", matchesController.getIccLive);
router.get("/ipl-live", matchesController.getIplLive);
router.get("/upcoming", matchesController.getUpcoming);
router.get("/recent", matchesController.getRecent);
router.get("/ipl", matchesController.getIpl);

export default router;
