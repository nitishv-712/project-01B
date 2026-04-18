import { Router, Request, Response } from "express";
import Course from "../models/Course";
import { authenticate, authorize, AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/courses — public
router.get("/", async (_req: Request, res: Response) => {
  try {
    const courses = await Course.find({ active: true }).lean();
    res.json({ success: true, data: courses });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch courses" });
  }
});

// GET /api/courses/all — admin: includes inactive courses
router.get("/all", authenticate, authorize("admin"), async (_req: AuthRequest, res: Response) => {
  try {
    const courses = await Course.find().lean();
    res.json({ success: true, data: courses });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch courses" });
  }
});

// GET /api/courses/:id — public
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const course = await Course.findOne({ id: req.params.id, active: true }).lean();
    if (!course) {
      res.status(404).json({ success: false, error: "Course not found" });
      return;
    }
    res.json({ success: true, data: course });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch course" });
  }
});

// POST /api/courses — admin only
router.post("/", authenticate, authorize("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const course = await Course.create(req.body);
    res.status(201).json({ success: true, data: course });
  } catch {
    res.status(400).json({ success: false, error: "Failed to create course" });
  }
});

// PUT /api/courses/:id — admin only
router.put("/:id", authenticate, authorize("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const course = await Course.findOneAndUpdate(
      { id: req.params.id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!course) {
      res.status(404).json({ success: false, error: "Course not found" });
      return;
    }
    res.json({ success: true, data: course });
  } catch {
    res.status(400).json({ success: false, error: "Failed to update course" });
  }
});

// PATCH /api/courses/:id/toggle — admin only: toggle active status
router.patch("/:id/toggle", authenticate, authorize("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const course = await Course.findOne({ id: req.params.id });
    if (!course) {
      res.status(404).json({ success: false, error: "Course not found" });
      return;
    }
    course.active = !course.active;
    await course.save();
    res.json({ success: true, data: { id: course.id, active: course.active } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to toggle course" });
  }
});

// DELETE /api/courses/:id — admin only
router.delete("/:id", authenticate, authorize("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const course = await Course.findOneAndDelete({ id: req.params.id });
    if (!course) {
      res.status(404).json({ success: false, error: "Course not found" });
      return;
    }
    res.json({ success: true, message: "Course deleted" });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete course" });
  }
});

export default router;
