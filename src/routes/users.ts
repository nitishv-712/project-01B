import { Router, Response } from "express";
import User from "../models/User";
import { authenticate, authorize, AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/users — admin: list all students
router.get("/", authenticate, authorize("admin"), async (_req: AuthRequest, res: Response) => {
  try {
    const users = await User.find({ role: "user" }).select("-password").lean();
    res.json({ success: true, data: users });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch users" });
  }
});

// GET /api/users/:id — admin: get single user with enrolled courses
router.get("/:id", authenticate, authorize("admin"), async (req: AuthRequest, res: Response) => {
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

// PATCH /api/users/:id/verify — admin: toggle verified status
router.patch("/:id/verify", authenticate, authorize("admin"), async (req: AuthRequest, res: Response) => {
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

// PATCH /api/users/:id/unenroll — admin: remove a course from a student
router.patch("/:id/unenroll", authenticate, authorize("admin"), async (req: AuthRequest, res: Response) => {
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

// DELETE /api/users/:id — admin: delete a student account
router.delete("/:id", authenticate, authorize("admin"), async (req: AuthRequest, res: Response) => {
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
