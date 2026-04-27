import { Router } from "express";
import { adminAuth } from "../middleware/adminAuth.js";
import { ok, fail } from "../utils/response.js";

const router = Router();

// Apply admin auth middleware to all routes
router.use(adminAuth);

// Add live match
router.post("/matches/live", async (req, res) => {
  try {
    const { url, sport, section, title } = req.body;

    if (!url || !sport || !section || !title) {
      return fail(res, 400, "Missing required fields");
    }

    // For now, return success - actual implementation will store in database
    const match = {
      id: `live-${Date.now()}`,
      url,
      sport,
      section,
      title,
      type: "live",
      createdAt: new Date().toISOString(),
    };

    return ok(res, { match, message: "Live match added successfully" });
  } catch (error) {
    console.error("Error adding live match:", error);
    return fail(res, 500, error?.message || "Failed to add live match");
  }
});

// Add upcoming match
router.post("/matches/upcoming", async (req, res) => {
  try {
    const { url, sport, section, title, date, time } = req.body;

    if (!url || !sport || !section || !title || !date || !time) {
      return fail(res, 400, "Missing required fields");
    }

    // For now, return success - actual implementation will store in database
    const match = {
      id: `upcoming-${Date.now()}`,
      url,
      sport,
      section,
      title,
      date,
      time,
      type: "upcoming",
      createdAt: new Date().toISOString(),
    };

    return ok(res, { match, message: "Upcoming match added successfully" });
  } catch (error) {
    console.error("Error adding upcoming match:", error);
    return fail(res, 500, error?.message || "Failed to add upcoming match");
  }
});

// Get all admin matches
router.get("/matches", async (req, res) => {
  try {
    // For now, return empty array - actual implementation will fetch from database
    const matches = [];
    return ok(res, { matches, message: "Matches retrieved successfully" });
  } catch (error) {
    console.error("Error fetching admin matches:", error);
    return fail(res, 500, error?.message || "Failed to fetch matches");
  }
});

// Delete match
router.delete("/matches/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return fail(res, 400, "Match ID is required");
    }

    // For now, return success - actual implementation will delete from database
    return ok(res, { id, message: "Match deleted successfully" });
  } catch (error) {
    console.error("Error deleting match:", error);
    return fail(res, 500, error?.message || "Failed to delete match");
  }
});

export default router;
