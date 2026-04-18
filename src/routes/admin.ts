import { Router, Response } from "express";
import Course from "../models/Course";
import User from "../models/User";
import Order from "../models/Order";
import Testimonial from "../models/Testimonial";
import { authenticate, authorize, AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/admin/dashboard — single call for all dashboard summary data
router.get("/dashboard", authenticate, authorize("admin"), async (_req: AuthRequest, res: Response) => {
  try {
    const [
      totalCourses,
      activeCourses,
      totalStudents,
      verifiedStudents,
      totalOrders,
      paidOrders,
      totalRevenue,
      totalTestimonials,
      activeTestimonials,
      recentOrders,
      recentStudents,
      totalAdmins,
    ] = await Promise.all([
      Course.countDocuments({}),
      Course.countDocuments({ active: true }),
      User.countDocuments({ role: "user" }),
      User.countDocuments({ role: "user", verified: true }),
      Order.countDocuments({}),
      Order.countDocuments({ status: "paid" }),
      Order.aggregate([
        { $match: { status: "paid" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Testimonial.countDocuments({}),
      Testimonial.countDocuments({ active: true }),
      Order.find({ status: "paid" })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      User.find({ role: "user" })
        .select("-password")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      User.countDocuments({ role: "admin" }),
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
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch dashboard data" });
  }
});

export default router;
