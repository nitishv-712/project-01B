import { Router, Request, Response } from "express";
import Testimonial from "../models/Testimonial";
import { authenticate, authorize, AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/testimonials — public
router.get("/", async (_req: Request, res: Response) => {
  try {
    const testimonials = await Testimonial.find({ active: true }).lean();
    res.json({ success: true, data: testimonials });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch testimonials" });
  }
});

// GET /api/testimonials/all — admin: includes inactive
router.get("/all", authenticate, authorize("admin"), async (_req: AuthRequest, res: Response) => {
  try {
    const testimonials = await Testimonial.find().lean();
    res.json({ success: true, data: testimonials });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch testimonials" });
  }
});

// POST /api/testimonials — admin only
router.post("/", authenticate, authorize("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const testimonial = await Testimonial.create(req.body);
    res.status(201).json({ success: true, data: testimonial });
  } catch {
    res.status(400).json({ success: false, error: "Failed to create testimonial" });
  }
});

// PUT /api/testimonials/:id — admin only
router.put("/:id", authenticate, authorize("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const testimonial = await Testimonial.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!testimonial) {
      res.status(404).json({ success: false, error: "Testimonial not found" });
      return;
    }
    res.json({ success: true, data: testimonial });
  } catch {
    res.status(400).json({ success: false, error: "Failed to update testimonial" });
  }
});

// PATCH /api/testimonials/:id/toggle — admin only: toggle active status
router.patch("/:id/toggle", authenticate, authorize("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const testimonial = await Testimonial.findById(req.params.id);
    if (!testimonial) {
      res.status(404).json({ success: false, error: "Testimonial not found" });
      return;
    }
    testimonial.active = !testimonial.active;
    await testimonial.save();
    res.json({ success: true, data: { _id: testimonial._id, active: testimonial.active } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to toggle testimonial" });
  }
});

// DELETE /api/testimonials/:id — admin only
router.delete("/:id", authenticate, authorize("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const testimonial = await Testimonial.findByIdAndDelete(req.params.id);
    if (!testimonial) {
      res.status(404).json({ success: false, error: "Testimonial not found" });
      return;
    }
    res.json({ success: true, message: "Testimonial deleted" });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete testimonial" });
  }
});

export default router;
