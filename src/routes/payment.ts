import { Router, Response } from "express";
import crypto from "crypto";
import Course from "../models/Course";
import Order from "../models/Order";
import User from "../models/User";
import { authenticate, authorize, AuthRequest } from "../middleware/auth";

const router = Router();

// POST /api/payment/initiate — student initiates a purchase
// Creates a pending order and returns a dummy payment session
// TODO: Replace dummy block with Razorpay order creation when ready:
//   const razorpay = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
//   const order = await razorpay.orders.create({ amount: course.price * 100, currency: 'INR', receipt: transactionId });
//   return res.json({ success: true, data: { orderId: order.id, amount: order.amount, currency: 'INR', key: process.env.RAZORPAY_KEY_ID } });
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

    // Generate a dummy transaction id
    const transactionId = `dummy_${crypto.randomBytes(8).toString("hex")}`;

    const order = await Order.create({
      userId: req.user!.id,
      courseId,
      amount: course.price,
      status: "pending",
      paymentMethod: "dummy",
      transactionId,
    });

    // TODO: When Razorpay is ready, return Razorpay order details here instead
    res.status(201).json({
      success: true,
      data: {
        orderId: order._id,
        transactionId,
        amount: course.price,
        courseId,
        courseTitle: course.title,
        paymentMethod: "dummy",
      },
    });
  } catch {
    res.status(500).json({ success: false, error: "Failed to initiate payment" });
  }
});

// POST /api/payment/confirm — confirms payment and enrolls the student
// For dummy: just pass the transactionId back to confirm
// TODO: Replace dummy verification with Razorpay signature verification:
//   const body = razorpay_order_id + "|" + razorpay_payment_id;
//   const expectedSignature = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!).update(body).digest("hex");
//   if (expectedSignature !== razorpay_signature) return res.status(400).json({ success: false, error: "Invalid payment signature" });
router.post("/confirm", authenticate, authorize("user"), async (req: AuthRequest, res: Response) => {
  try {
    const { transactionId } = req.body;

    const order = await Order.findOne({ transactionId, userId: req.user!.id, status: "pending" });
    if (!order) {
      res.status(404).json({ success: false, error: "Order not found or already processed" });
      return;
    }

    // TODO: Add Razorpay signature verification here before marking as paid

    // Enroll student first, then mark order paid — both in one shot
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

// GET /api/payment/orders — student views their own order history
router.get("/orders", authenticate, authorize("user"), async (req: AuthRequest, res: Response) => {
  try {
    const orders = await Order.find({ userId: req.user!.id }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: orders });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch orders" });
  }
});

// GET /api/payment/orders/all — admin views all orders
router.get("/orders/all", authenticate, authorize("admin"), async (_req: AuthRequest, res: Response) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: orders });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch orders" });
  }
});

export default router;
