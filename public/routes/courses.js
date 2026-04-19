"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Course_1 = __importDefault(require("../models/Course"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET /api/courses — public
router.get("/", async (_req, res) => {
    try {
        const courses = await Course_1.default.find({ active: true }).lean();
        res.json({ success: true, data: courses });
    }
    catch {
        res.status(500).json({ success: false, error: "Failed to fetch courses" });
    }
});
// GET /api/courses/all — requires courses:read
router.get("/all", auth_1.authenticate, (0, auth_1.authorizePermission)("courses:read"), async (_req, res) => {
    try {
        const courses = await Course_1.default.find().lean();
        res.json({ success: true, data: courses });
    }
    catch {
        res.status(500).json({ success: false, error: "Failed to fetch courses" });
    }
});
// GET /api/courses/:id — public
router.get("/:id", async (req, res) => {
    try {
        const course = await Course_1.default.findOne({ id: req.params.id, active: true }).lean();
        if (!course) {
            res.status(404).json({ success: false, error: "Course not found" });
            return;
        }
        res.json({ success: true, data: course });
    }
    catch {
        res.status(500).json({ success: false, error: "Failed to fetch course" });
    }
});
// POST /api/courses — requires courses:create
router.post("/", auth_1.authenticate, (0, auth_1.authorizePermission)("courses:create"), async (req, res) => {
    try {
        const course = await Course_1.default.create(req.body);
        res.status(201).json({ success: true, data: course });
    }
    catch {
        res.status(400).json({ success: false, error: "Failed to create course" });
    }
});
// PUT /api/courses/:id — requires courses:update
router.put("/:id", auth_1.authenticate, (0, auth_1.authorizePermission)("courses:update"), async (req, res) => {
    try {
        const course = await Course_1.default.findOneAndUpdate({ id: req.params.id }, req.body, { new: true, runValidators: true });
        if (!course) {
            res.status(404).json({ success: false, error: "Course not found" });
            return;
        }
        res.json({ success: true, data: course });
    }
    catch {
        res.status(400).json({ success: false, error: "Failed to update course" });
    }
});
// PATCH /api/courses/:id/toggle — requires courses:update
router.patch("/:id/toggle", auth_1.authenticate, (0, auth_1.authorizePermission)("courses:update"), async (req, res) => {
    try {
        const course = await Course_1.default.findOne({ id: req.params.id });
        if (!course) {
            res.status(404).json({ success: false, error: "Course not found" });
            return;
        }
        course.active = !course.active;
        await course.save();
        res.json({ success: true, data: { id: course.id, active: course.active } });
    }
    catch {
        res.status(500).json({ success: false, error: "Failed to toggle course" });
    }
});
// DELETE /api/courses/:id — requires courses:delete
router.delete("/:id", auth_1.authenticate, (0, auth_1.authorizePermission)("courses:delete"), async (req, res) => {
    try {
        const course = await Course_1.default.findOneAndDelete({ id: req.params.id });
        if (!course) {
            res.status(404).json({ success: false, error: "Course not found" });
            return;
        }
        res.json({ success: true, message: "Course deleted" });
    }
    catch {
        res.status(500).json({ success: false, error: "Failed to delete course" });
    }
});
exports.default = router;
