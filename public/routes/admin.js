"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Course_1 = __importDefault(require("../models/Course"));
const User_1 = __importDefault(require("../models/User"));
const Order_1 = __importDefault(require("../models/Order"));
const Testimonial_1 = __importDefault(require("../models/Testimonial"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET /api/admin/dashboard — single call for all dashboard summary data
router.get("/dashboard", auth_1.authenticate, (0, auth_1.authorize)("admin"), async (_req, res) => {
    try {
        const [totalCourses, activeCourses, totalStudents, verifiedStudents, totalOrders, paidOrders, totalRevenue, totalTestimonials, activeTestimonials, recentOrders, recentStudents, totalAdmins,] = await Promise.all([
            Course_1.default.countDocuments({}),
            Course_1.default.countDocuments({ active: true }),
            User_1.default.countDocuments({ role: "user" }),
            User_1.default.countDocuments({ role: "user", verified: true }),
            Order_1.default.countDocuments({}),
            Order_1.default.countDocuments({ status: "paid" }),
            Order_1.default.aggregate([
                { $match: { status: "paid" } },
                { $group: { _id: null, total: { $sum: "$amount" } } },
            ]),
            Testimonial_1.default.countDocuments({}),
            Testimonial_1.default.countDocuments({ active: true }),
            Order_1.default.find({ status: "paid" })
                .sort({ createdAt: -1 })
                .limit(5)
                .lean(),
            User_1.default.find({ role: "user" })
                .select("-password")
                .sort({ createdAt: -1 })
                .limit(5)
                .lean(),
            User_1.default.countDocuments({ role: "admin" }),
        ]);
        res.json({
            success: true,
            data: {
                courses: {
                    total: totalCourses,
                    active: activeCourses,
                    inactive: totalCourses - activeCourses,
                },
                students: {
                    total: totalStudents,
                    verified: verifiedStudents,
                    unverified: totalStudents - verifiedStudents,
                },
                orders: {
                    total: totalOrders,
                    paid: paidOrders,
                    pending: totalOrders - paidOrders,
                    revenue: totalRevenue[0]?.total ?? 0,
                },
                testimonials: {
                    total: totalTestimonials,
                    active: activeTestimonials,
                    inactive: totalTestimonials - activeTestimonials,
                },
                recentOrders,
                recentStudents,
                admins: { total: totalAdmins },
            },
        });
    }
    catch {
        res.status(500).json({ success: false, error: "Failed to fetch dashboard data" });
    }
});
exports.default = router;
