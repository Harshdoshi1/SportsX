import { Router } from "express";
import { adminAuth } from "../middleware/adminAuth.js";
import { adminMatchController } from "../controllers/adminMatchController.js";

const router = Router();

// Apply admin auth middleware to all routes
router.use(adminAuth);

// Add live match
router.post("/matches/live", adminMatchController.addLiveMatch);

// Add upcoming match
router.post("/matches/upcoming", adminMatchController.addUpcomingMatch);

// Get all admin matches
router.get("/matches", adminMatchController.getAllMatches);

// Get all live matches with scraped data
router.get("/matches/live", adminMatchController.getAllLiveMatches);

// Get live match data by ID (with scraping)
router.get("/matches/:id", adminMatchController.getLiveMatchData);

// Delete match
router.delete("/matches/:id", adminMatchController.deleteMatch);

export default router;
