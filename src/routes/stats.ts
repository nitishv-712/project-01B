import { Router, Request, Response } from "express";
import Stats from "../models/Stats";
import { authenticate, authorize, AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/stats — public
router.get("/", async (_req: Request, res: Response) => {
  try {
    const stats = await Stats.findOne().lean();
    res.json({ success: true, data: stats });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch stats" });
  }
});

// PUT /api/stats — admin only: update platform stats
router.put("/", authenticate, authorize("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const stats = await Stats.findOneAndUpdate({}, req.body, { new: true, upsert: true, runValidators: true });
    res.json({ success: true, data: stats });
  } catch {
    res.status(400).json({ success: false, error: "Failed to update stats" });
  }
});

export default router;
