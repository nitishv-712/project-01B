"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Testimonial_1 = __importDefault(require("../models/Testimonial"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET /api/testimonials — public
router.get("/", async (_req, res) => {
    try {
        const testimonials = await Testimonial_1.default.find({ active: true }).lean();
        res.json({ success: true, data: testimonials });
    }
    catch {
        res.status(500).json({ success: false, error: "Failed to fetch testimonials" });
    }
});
// GET /api/testimonials/all — requires testimonials:read
router.get("/all", auth_1.authenticate, (0, auth_1.authorizePermission)("testimonials:read"), async (_req, res) => {
    try {
        const testimonials = await Testimonial_1.default.find().lean();
        res.json({ success: true, data: testimonials });
    }
    catch {
        res.status(500).json({ success: false, error: "Failed to fetch testimonials" });
    }
});
// POST /api/testimonials — requires testimonials:create
router.post("/", auth_1.authenticate, (0, auth_1.authorizePermission)("testimonials:create"), async (req, res) => {
    try {
        const testimonial = await Testimonial_1.default.create(req.body);
        res.status(201).json({ success: true, data: testimonial });
    }
    catch {
        res.status(400).json({ success: false, error: "Failed to create testimonial" });
    }
});
// PUT /api/testimonials/:id — requires testimonials:update
router.put("/:id", auth_1.authenticate, (0, auth_1.authorizePermission)("testimonials:update"), async (req, res) => {
    try {
        const testimonial = await Testimonial_1.default.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });
        if (!testimonial) {
            res.status(404).json({ success: false, error: "Testimonial not found" });
            return;
        }
        res.json({ success: true, data: testimonial });
    }
    catch {
        res.status(400).json({ success: false, error: "Failed to update testimonial" });
    }
});
// PATCH /api/testimonials/:id/toggle — requires testimonials:update
router.patch("/:id/toggle", auth_1.authenticate, (0, auth_1.authorizePermission)("testimonials:update"), async (req, res) => {
    try {
        const testimonial = await Testimonial_1.default.findById(req.params.id);
        if (!testimonial) {
            res.status(404).json({ success: false, error: "Testimonial not found" });
            return;
        }
        testimonial.active = !testimonial.active;
        await testimonial.save();
        res.json({ success: true, data: { _id: testimonial._id, active: testimonial.active } });
    }
    catch {
        res.status(500).json({ success: false, error: "Failed to toggle testimonial" });
    }
});
// DELETE /api/testimonials/:id — requires testimonials:delete
router.delete("/:id", auth_1.authenticate, (0, auth_1.authorizePermission)("testimonials:delete"), async (req, res) => {
    try {
        const testimonial = await Testimonial_1.default.findByIdAndDelete(req.params.id);
        if (!testimonial) {
            res.status(404).json({ success: false, error: "Testimonial not found" });
            return;
        }
        res.json({ success: true, message: "Testimonial deleted" });
    }
    catch {
        res.status(500).json({ success: false, error: "Failed to delete testimonial" });
    }
});
exports.default = router;
