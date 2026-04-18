import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User";
import Course from "../models/Course";
import { authenticate, authorize, authorizePermission, AuthRequest } from "../middleware/auth";
import { JwtPayload, ALL_PERMISSIONS } from "../types";

const router = Router();

function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: "7d" });
}

// POST /api/auth/register — public, always creates role: 'user'
router.post("/register", async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;
    const exists = await User.findOne({ email });
    if (exists) {
      res.status(400).json({ success: false, error: "Email already registered" });
      return;
    }
    const user = await User.create({ name, email, password, role: "user" });
    const token = signToken({ id: user._id.toString(), name: user.name, email: user.email, role: user.role, permissions: [] });
    res.status(201).json({ success: true, data: { token, name: user.name, email: user.email, role: user.role } });
  } catch {
    res.status(400).json({ success: false, error: "Registration failed" });
  }
});

// POST /api/auth/login — public
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      res.status(401).json({ success: false, error: "Invalid credentials" });
      return;
    }
    const token = signToken({ id: user._id.toString(), name: user.name, email: user.email, role: user.role, permissions: user.permissions ?? [] });
    res.json({ success: true, data: { token, name: user.name, email: user.email, role: user.role, permissions: user.permissions ?? [] } });
  } catch {
    res.status(500).json({ success: false, error: "Login failed" });
  }
});

// POST /api/auth/create-admin — superadmin only
router.post("/create-admin", authenticate, authorize("superadmin"), async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, password } = req.body;
    const exists = await User.findOne({ email });
    if (exists) {
      res.status(400).json({ success: false, error: "Email already registered" });
      return;
    }
    const user = await User.create({ name, email, password, role: "admin" });
    res.status(201).json({ success: true, data: { name: user.name, email: user.email, role: user.role } });
  } catch {
    res.status(400).json({ success: false, error: "Failed to create admin" });
  }
});

// GET /api/auth/me — any authenticated user
router.get("/me", authenticate, (req: AuthRequest, res: Response) => {
  res.json({ success: true, data: req.user });
});

// POST /api/auth/enroll — REMOVED: enrollment is now handled via /api/payment/confirm

// GET /api/auth/my-courses — student sees their enrolled courses with full details
router.get("/my-courses", authenticate, authorize("user"), async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user!.id).lean();
    if (!user) {
      res.status(404).json({ success: false, error: "User not found" });
      return;
    }
    const courses = await Course.find({ id: { $in: user.enrolledCourses }, active: true }).lean();
    res.json({ success: true, data: courses });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch enrolled courses" });
  }
});

// PATCH /api/auth/profile — student updates their own profile (avatar, phone, name)
// admin can also update their own profile via profile:manage_own permission
router.patch("/profile", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, phone, avatar } = req.body;
    const isSelf = req.user!.role === "user" ||
      req.user!.role === "superadmin" ||
      (req.user!.role === "admin" && req.user!.permissions.includes("profile:manage_own"));

    if (!isSelf) {
      res.status(403).json({ success: false, error: "Forbidden: requires 'profile:manage_own' permission" });
      return;
    }
    const user = await User.findByIdAndUpdate(
      req.user!.id,
      { ...(name && { name }), ...(phone && { phone }), ...(avatar && { avatar }) },
      { new: true, runValidators: true }
    ).select("-password");
    if (!user) {
      res.status(404).json({ success: false, error: "User not found" });
      return;
    }
    res.json({ success: true, data: user });
  } catch {
    res.status(400).json({ success: false, error: "Failed to update profile" });
  }
});

export default router;
