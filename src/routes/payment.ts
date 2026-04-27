import express, { Router, Response, Request } from "express";
import crypto from "crypto";
import Razorpay from "razorpay";
import Course from "../models/Course";
import Order from "../models/Order";
import User from "../models/User";
import { authenticate, authorize, authorizePermission, AuthRequest } from "../middleware/auth";

const router = Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// POST /api/payment/initiate — creates a Razorpay order
router.post("/initiate", authenticate, authorize("user"), async (req: AuthRequest, res: Response) => {
  try {
    const { courseId } = req.body;

    const course = await Course.findOne({ id: courseId, active: true });
    if (!course) {
      res.status(404).json({ success: false, error: "Course not found" });
      return;
    }

    const user = await User.findById(req.user!.id);
    if (!user) {
      res.status(404).json({ success: false, error: "User not found" });
      return;
    }

    if (user.enrolledCourses.includes(courseId)) {
      res.status(400).json({ success: false, error: "Already enrolled in this course" });
      return;
    }

    const razorpayOrder = await razorpay.orders.create({
      amount: course.price * 100, // paise
      currency: "INR",
      receipt: `receipt_${crypto.randomBytes(8).toString("hex")}`,
    });

    const order = await Order.create({
      userId: req.user!.id,
      courseId,
      amount: course.price,
      status: "pending",
      paymentMethod: "razorpay",
      transactionId: razorpayOrder.id,
    });

    res.status(201).json({
      success: true,
      data: {
        orderId: order._id,
        razorpayOrderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        key: process.env.RAZORPAY_KEY_ID,
        courseId,
        courseTitle: course.title,
      },
    });
  } catch {
    res.status(500).json({ success: false, error: "Failed to initiate payment" });
  }
});

// POST /api/payment/confirm — verifies Razorpay signature and enrolls student
router.post("/confirm", authenticate, authorize("user"), async (req: AuthRequest, res: Response) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      res.status(400).json({ success: false, error: "Invalid payment signature" });
      return;
    }

    const order = await Order.findOne({ transactionId: razorpay_order_id, userId: req.user!.id, status: "pending" });
    if (!order) {
      res.status(404).json({ success: false, error: "Order not found or already processed" });
      return;
    }

    const user = await User.findByIdAndUpdate(
      req.user!.id,
      { $addToSet: { enrolledCourses: order.courseId } },
      { new: true }
    );
    if (!user) {
      res.status(404).json({ success: false, error: "User not found" });
      return;
    }

    order.status = "paid";
    order.transactionId = razorpay_payment_id;
    await order.save();

    res.json({
      success: true,
      data: {
        enrolled: true,
        courseId: order.courseId,
        transactionId: order.transactionId,
        amount: order.amount,
      },
    });
  } catch {
    res.status(500).json({ success: false, error: "Failed to confirm payment" });
  }
});

// POST /api/payment/webhook — Razorpay webhook handler
router.post("/webhook", express.raw({ type: "application/json" }), (req: Request, res: Response) => {
  const signature = req.headers["x-razorpay-signature"] as string;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(req.body)
    .digest("hex");

  if (expectedSignature !== signature) {
    res.status(400).json({ success: false, error: "Invalid webhook signature" });
    return;
  }

  res.json({ success: true });
});

// GET /api/payment/orders — student views their own order history
router.get("/orders", authenticate, authorize("user"), async (req: AuthRequest, res: Response) => {
  try {
    const orders = await Order.find({ userId: req.user!.id }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: orders });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch orders" });
  }
});

// GET /api/payment/orders/all — requires orders:read
router.get("/orders/all", authenticate, authorizePermission("orders:read"), async (_req: AuthRequest, res: Response) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: orders });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch orders" });
  }
});

export default router;
