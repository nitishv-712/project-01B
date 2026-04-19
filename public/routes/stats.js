"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Stats_1 = __importDefault(require("../models/Stats"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET /api/stats — public
router.get("/", async (_req, res) => {
    try {
        const stats = await Stats_1.default.findOne().lean();
        res.json({ success: true, data: stats });
    }
    catch {
        res.status(500).json({ success: false, error: "Failed to fetch stats" });
    }
});
// PUT /api/stats — requires stats:update
router.put("/", auth_1.authenticate, (0, auth_1.authorizePermission)("stats:update"), async (req, res) => {
    try {
        const stats = await Stats_1.default.findOneAndUpdate({}, req.body, { new: true, upsert: true, runValidators: true });
        res.json({ success: true, data: stats });
    }
    catch {
        res.status(400).json({ success: false, error: "Failed to update stats" });
    }
});
exports.default = router;
