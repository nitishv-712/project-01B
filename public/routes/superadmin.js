"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const User_1 = __importDefault(require("../models/User"));
const auth_1 = require("../middleware/auth");
const types_1 = require("../types");
const router = (0, express_1.Router)();
// All routes here are superadmin only
// GET /api/superadmin/admins — list all admins with their permissions
router.get("/admins", auth_1.authenticate, (0, auth_1.authorize)("superadmin"), async (_req, res) => {
    try {
        const admins = await User_1.default.find({ role: "admin" }).select("-password").lean();
        res.json({ success: true, data: admins });
    }
    catch {
        res.status(500).json({ success: false, error: "Failed to fetch admins" });
    }
});
// GET /api/superadmin/admins/:id — get single admin
router.get("/admins/:id", auth_1.authenticate, (0, auth_1.authorize)("superadmin"), async (req, res) => {
    try {
        const admin = await User_1.default.findOne({ _id: req.params.id, role: "admin" }).select("-password").lean();
        if (!admin) {
            res.status(404).json({ success: false, error: "Admin not found" });
            return;
        }
        res.json({ success: true, data: admin });
    }
    catch {
        res.status(500).json({ success: false, error: "Failed to fetch admin" });
    }
});
// PATCH /api/superadmin/admins/:id/permissions — set permissions for an admin
router.patch("/admins/:id/permissions", auth_1.authenticate, (0, auth_1.authorize)("superadmin"), async (req, res) => {
    try {
        const { permissions } = req.body;
        // Validate all permissions are valid
        const invalid = permissions.filter(p => !types_1.ALL_PERMISSIONS.includes(p));
        if (invalid.length > 0) {
            res.status(400).json({ success: false, error: `Invalid permissions: ${invalid.join(", ")}` });
            return;
        }
        const admin = await User_1.default.findOneAndUpdate({ _id: req.params.id, role: "admin" }, { permissions }, { new: true }).select("-password");
        if (!admin) {
            res.status(404).json({ success: false, error: "Admin not found" });
            return;
        }
        res.json({ success: true, data: { _id: admin._id, name: admin.name, email: admin.email, permissions: admin.permissions } });
    }
    catch {
        res.status(500).json({ success: false, error: "Failed to update permissions" });
    }
});
// PATCH /api/superadmin/admins/:id/grant — add a single permission
router.patch("/admins/:id/grant", auth_1.authenticate, (0, auth_1.authorize)("superadmin"), async (req, res) => {
    try {
        const { permission } = req.body;
        if (!types_1.ALL_PERMISSIONS.includes(permission)) {
            res.status(400).json({ success: false, error: `Invalid permission: ${permission}` });
            return;
        }
        const admin = await User_1.default.findOneAndUpdate({ _id: req.params.id, role: "admin" }, { $addToSet: { permissions: permission } }, { new: true }).select("-password");
        if (!admin) {
            res.status(404).json({ success: false, error: "Admin not found" });
            return;
        }
        res.json({ success: true, data: { _id: admin._id, permissions: admin.permissions } });
    }
    catch {
        res.status(500).json({ success: false, error: "Failed to grant permission" });
    }
});
// PATCH /api/superadmin/admins/:id/revoke — remove a single permission
router.patch("/admins/:id/revoke", auth_1.authenticate, (0, auth_1.authorize)("superadmin"), async (req, res) => {
    try {
        const { permission } = req.body;
        const admin = await User_1.default.findOneAndUpdate({ _id: req.params.id, role: "admin" }, { $pull: { permissions: permission } }, { new: true }).select("-password");
        if (!admin) {
            res.status(404).json({ success: false, error: "Admin not found" });
            return;
        }
        res.json({ success: true, data: { _id: admin._id, permissions: admin.permissions } });
    }
    catch {
        res.status(500).json({ success: false, error: "Failed to revoke permission" });
    }
});
// DELETE /api/superadmin/admins/:id — delete an admin account
router.delete("/admins/:id", auth_1.authenticate, (0, auth_1.authorize)("superadmin"), async (req, res) => {
    try {
        const admin = await User_1.default.findOneAndDelete({ _id: req.params.id, role: "admin" });
        if (!admin) {
            res.status(404).json({ success: false, error: "Admin not found" });
            return;
        }
        res.json({ success: true, message: "Admin deleted" });
    }
    catch {
        res.status(500).json({ success: false, error: "Failed to delete admin" });
    }
});
// GET /api/superadmin/permissions — list all available permissions and presets
router.get("/permissions", auth_1.authenticate, (0, auth_1.authorize)("superadmin"), (_req, res) => {
    res.json({ success: true, data: { permissions: types_1.ALL_PERMISSIONS, presets: types_1.PERMISSION_PRESETS } });
});
exports.default = router;
