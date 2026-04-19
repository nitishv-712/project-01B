"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const Course_1 = __importDefault(require("../models/Course"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
function signToken(payload) {
    return jsonwebtoken_1.default.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });
}
// POST /api/auth/register — public, always creates role: 'user'
router.post("/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const exists = await User_1.default.findOne({ email });
        if (exists) {
            res.status(400).json({ success: false, error: "Email already registered" });
            return;
        }
        const user = await User_1.default.create({ name, email, password, role: "user" });
        const token = signToken({ id: user._id.toString(), name: user.name, email: user.email, role: user.role, permissions: [] });
        res.status(201).json({ success: true, data: { token, name: user.name, email: user.email, role: user.role } });
    }
    catch {
        res.status(400).json({ success: false, error: "Registration failed" });
    }
});
// POST /api/auth/login — public
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User_1.default.findOne({ email });
        if (!user || !(await bcryptjs_1.default.compare(password, user.password))) {
            res.status(401).json({ success: false, error: "Invalid credentials" });
            return;
        }
        const token = signToken({ id: user._id.toString(), name: user.name, email: user.email, role: user.role, permissions: user.permissions ?? [] });
        res.json({ success: true, data: { token, name: user.name, email: user.email, role: user.role, permissions: user.permissions ?? [] } });
    }
    catch {
        res.status(500).json({ success: false, error: "Login failed" });
    }
});
// POST /api/auth/create-admin — superadmin only
router.post("/create-admin", auth_1.authenticate, (0, auth_1.authorize)("superadmin"), async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const exists = await User_1.default.findOne({ email });
        if (exists) {
            res.status(400).json({ success: false, error: "Email already registered" });
            return;
        }
        const user = await User_1.default.create({ name, email, password, role: "admin" });
        res.status(201).json({ success: true, data: { name: user.name, email: user.email, role: user.role } });
    }
    catch {
        res.status(400).json({ success: false, error: "Failed to create admin" });
    }
});
// GET /api/auth/me — any authenticated user
router.get("/me", auth_1.authenticate, (req, res) => {
    res.json({ success: true, data: req.user });
});
// POST /api/auth/enroll — REMOVED: enrollment is now handled via /api/payment/confirm
// GET /api/auth/my-courses — student sees their enrolled courses with full details
router.get("/my-courses", auth_1.authenticate, (0, auth_1.authorize)("user"), async (req, res) => {
    try {
        const user = await User_1.default.findById(req.user.id).lean();
        if (!user) {
            res.status(404).json({ success: false, error: "User not found" });
            return;
        }
        const courses = await Course_1.default.find({ id: { $in: user.enrolledCourses }, active: true }).lean();
        res.json({ success: true, data: courses });
    }
    catch {
        res.status(500).json({ success: false, error: "Failed to fetch enrolled courses" });
    }
});
// PATCH /api/auth/profile — student updates their own profile (avatar, phone, name)
// admin can also update their own profile via profile:manage_own permission
router.patch("/profile", auth_1.authenticate, async (req, res) => {
    try {
        const { name, phone, avatar } = req.body;
        const isSelf = req.user.role === "user" ||
            req.user.role === "superadmin" ||
            (req.user.role === "admin" && req.user.permissions.includes("profile:manage_own"));
        if (!isSelf) {
            res.status(403).json({ success: false, error: "Forbidden: requires 'profile:manage_own' permission" });
            return;
        }
        const user = await User_1.default.findByIdAndUpdate(req.user.id, { ...(name && { name }), ...(phone && { phone }), ...(avatar && { avatar }) }, { new: true, runValidators: true }).select("-password");
        if (!user) {
            res.status(404).json({ success: false, error: "User not found" });
            return;
        }
        res.json({ success: true, data: user });
    }
    catch {
        res.status(400).json({ success: false, error: "Failed to update profile" });
    }
});
exports.default = router;
