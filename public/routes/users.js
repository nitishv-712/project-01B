"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const User_1 = __importDefault(require("../models/User"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET /api/users — requires users:read
router.get("/", auth_1.authenticate, (0, auth_1.authorizePermission)("users:read"), async (_req, res) => {
    try {
        const users = await User_1.default.find({ role: "user" }).select("-password").lean();
        res.json({ success: true, data: users });
    }
    catch {
        res.status(500).json({ success: false, error: "Failed to fetch users" });
    }
});
// GET /api/users/:id — requires users:read
router.get("/:id", auth_1.authenticate, (0, auth_1.authorizePermission)("users:read"), async (req, res) => {
    try {
        const user = await User_1.default.findById(req.params.id).select("-password").lean();
        if (!user) {
            res.status(404).json({ success: false, error: "User not found" });
            return;
        }
        res.json({ success: true, data: user });
    }
    catch {
        res.status(500).json({ success: false, error: "Failed to fetch user" });
    }
});
// PATCH /api/users/:id/verify — requires users:update
router.patch("/:id/verify", auth_1.authenticate, (0, auth_1.authorizePermission)("users:update"), async (req, res) => {
    try {
        const user = await User_1.default.findById(req.params.id);
        if (!user) {
            res.status(404).json({ success: false, error: "User not found" });
            return;
        }
        user.verified = !user.verified;
        await user.save();
        res.json({ success: true, data: { _id: user._id, verified: user.verified } });
    }
    catch {
        res.status(500).json({ success: false, error: "Failed to toggle verification" });
    }
});
// PATCH /api/users/:id/unenroll — requires users:update
router.patch("/:id/unenroll", auth_1.authenticate, (0, auth_1.authorizePermission)("users:update"), async (req, res) => {
    try {
        const { courseId } = req.body;
        const user = await User_1.default.findByIdAndUpdate(req.params.id, { $pull: { enrolledCourses: courseId } }, { new: true }).select("-password");
        if (!user) {
            res.status(404).json({ success: false, error: "User not found" });
            return;
        }
        res.json({ success: true, data: { enrolledCourses: user.enrolledCourses } });
    }
    catch {
        res.status(500).json({ success: false, error: "Failed to unenroll user" });
    }
});
// DELETE /api/users/:id — requires users:delete
router.delete("/:id", auth_1.authenticate, (0, auth_1.authorizePermission)("users:delete"), async (req, res) => {
    try {
        const user = await User_1.default.findByIdAndDelete(req.params.id);
        if (!user) {
            res.status(404).json({ success: false, error: "User not found" });
            return;
        }
        res.json({ success: true, message: "User deleted" });
    }
    catch {
        res.status(500).json({ success: false, error: "Failed to delete user" });
    }
});
exports.default = router;
