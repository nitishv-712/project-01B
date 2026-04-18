import { Router, Response } from "express";
import User from "../models/User";
import { authenticate, authorize, AuthRequest } from "../middleware/auth";
import { ALL_PERMISSIONS, PERMISSION_PRESETS, Permission } from "../types";

const router = Router();

// All routes here are superadmin only

// GET /api/superadmin/admins — list all admins with their permissions
router.get("/admins", authenticate, authorize("superadmin"), async (_req: AuthRequest, res: Response) => {
  try {
    const admins = await User.find({ role: "admin" }).select("-password").lean();
    res.json({ success: true, data: admins });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch admins" });
  }
});

// GET /api/superadmin/admins/:id — get single admin
router.get("/admins/:id", authenticate, authorize("superadmin"), async (req: AuthRequest, res: Response) => {
  try {
    const admin = await User.findOne({ _id: req.params.id, role: "admin" }).select("-password").lean();
    if (!admin) {
      res.status(404).json({ success: false, error: "Admin not found" });
      return;
    }
    res.json({ success: true, data: admin });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch admin" });
  }
});

// PATCH /api/superadmin/admins/:id/permissions — set permissions for an admin
router.patch("/admins/:id/permissions", authenticate, authorize("superadmin"), async (req: AuthRequest, res: Response) => {
  try {
    const { permissions } = req.body as { permissions: Permission[] };

    // Validate all permissions are valid
    const invalid = permissions.filter(p => !ALL_PERMISSIONS.includes(p));
    if (invalid.length > 0) {
      res.status(400).json({ success: false, error: `Invalid permissions: ${invalid.join(", ")}` });
      return;
    }

    const admin = await User.findOneAndUpdate(
      { _id: req.params.id, role: "admin" },
      { permissions },
      { new: true }
    ).select("-password");

    if (!admin) {
      res.status(404).json({ success: false, error: "Admin not found" });
      return;
    }

    res.json({ success: true, data: { _id: admin._id, name: admin.name, email: admin.email, permissions: admin.permissions } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update permissions" });
  }
});

// PATCH /api/superadmin/admins/:id/grant — add a single permission
router.patch("/admins/:id/grant", authenticate, authorize("superadmin"), async (req: AuthRequest, res: Response) => {
  try {
    const { permission } = req.body as { permission: Permission };

    if (!ALL_PERMISSIONS.includes(permission)) {
      res.status(400).json({ success: false, error: `Invalid permission: ${permission}` });
      return;
    }

    const admin = await User.findOneAndUpdate(
      { _id: req.params.id, role: "admin" },
      { $addToSet: { permissions: permission } },
      { new: true }
    ).select("-password");

    if (!admin) {
      res.status(404).json({ success: false, error: "Admin not found" });
      return;
    }

    res.json({ success: true, data: { _id: admin._id, permissions: admin.permissions } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to grant permission" });
  }
});

// PATCH /api/superadmin/admins/:id/revoke — remove a single permission
router.patch("/admins/:id/revoke", authenticate, authorize("superadmin"), async (req: AuthRequest, res: Response) => {
  try {
    const { permission } = req.body as { permission: Permission };

    const admin = await User.findOneAndUpdate(
      { _id: req.params.id, role: "admin" },
      { $pull: { permissions: permission } },
      { new: true }
    ).select("-password");

    if (!admin) {
      res.status(404).json({ success: false, error: "Admin not found" });
      return;
    }

    res.json({ success: true, data: { _id: admin._id, permissions: admin.permissions } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to revoke permission" });
  }
});

// DELETE /api/superadmin/admins/:id — delete an admin account
router.delete("/admins/:id", authenticate, authorize("superadmin"), async (req: AuthRequest, res: Response) => {
  try {
    const admin = await User.findOneAndDelete({ _id: req.params.id, role: "admin" });
    if (!admin) {
      res.status(404).json({ success: false, error: "Admin not found" });
      return;
    }
    res.json({ success: true, message: "Admin deleted" });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete admin" });
  }
});

// GET /api/superadmin/permissions — list all available permissions and presets
router.get("/permissions", authenticate, authorize("superadmin"), (_req: AuthRequest, res: Response) => {
  res.json({ success: true, data: { permissions: ALL_PERMISSIONS, presets: PERMISSION_PRESETS } });
});

export default router;
