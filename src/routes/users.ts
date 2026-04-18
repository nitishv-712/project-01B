import { Router, Response } from "express";
import User from "../models/User";
import { authenticate, authorize, authorizePermission, AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/users — requires users:read
router.get("/", authenticate, authorizePermission("users:read"), async (_req: AuthRequest, res: Response) => {
  try {
    const users = await User.find({ role: "user" }).select("-password").lean();
    res.json({ success: true, data: users });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch users" });
  }
});

// GET /api/users/:id — requires users:read
router.get("/:id", authenticate, authorizePermission("users:read"), async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.params.id).select("-password").lean();
    if (!user) {
      res.status(404).json({ success: false, error: "User not found" });
      return;
    }
    res.json({ success: true, data: user });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch user" });
  }
});

// PATCH /api/users/:id/verify — requires users:update
router.patch("/:id/verify", authenticate, authorizePermission("users:update"), async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404).json({ success: false, error: "User not found" });
      return;
    }
    user.verified = !user.verified;
    await user.save();
    res.json({ success: true, data: { _id: user._id, verified: user.verified } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to toggle verification" });
  }
});

// PATCH /api/users/:id/unenroll — requires users:update
router.patch("/:id/unenroll", authenticate, authorizePermission("users:update"), async (req: AuthRequest, res: Response) => {
  try {
    const { courseId } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $pull: { enrolledCourses: courseId } },
      { new: true }
    ).select("-password");
    if (!user) {
      res.status(404).json({ success: false, error: "User not found" });
      return;
    }
    res.json({ success: true, data: { enrolledCourses: user.enrolledCourses } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to unenroll user" });
  }
});

// DELETE /api/users/:id — requires users:delete
router.delete("/:id", authenticate, authorizePermission("users:delete"), async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      res.status(404).json({ success: false, error: "User not found" });
      return;
    }
    res.json({ success: true, message: "User deleted" });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete user" });
  }
});

export default router;
