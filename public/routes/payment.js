"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importStar(require("express"));
const crypto_1 = __importDefault(require("crypto"));
const razorpay_1 = __importDefault(require("razorpay"));
const Course_1 = __importDefault(require("../models/Course"));
const Order_1 = __importDefault(require("../models/Order"));
const User_1 = __importDefault(require("../models/User"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const razorpay = new razorpay_1.default({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});
// POST /api/payment/initiate — creates a Razorpay order
router.post("/initiate", auth_1.authenticate, (0, auth_1.authorize)("user"), async (req, res) => {
    try {
        const { courseId } = req.body;
        const course = await Course_1.default.findOne({ id: courseId, active: true });
        if (!course) {
            res.status(404).json({ success: false, error: "Course not found" });
            return;
        }
        const user = await User_1.default.findById(req.user.id);
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
            receipt: `receipt_${crypto_1.default.randomBytes(8).toString("hex")}`,
        });
        const order = await Order_1.default.create({
            userId: req.user.id,
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
    }
    catch {
        res.status(500).json({ success: false, error: "Failed to initiate payment" });
    }
});
// POST /api/payment/confirm — verifies Razorpay signature and enrolls student
router.post("/confirm", auth_1.authenticate, (0, auth_1.authorize)("user"), async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        const expectedSignature = crypto_1.default
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest("hex");
        if (expectedSignature !== razorpay_signature) {
            res.status(400).json({ success: false, error: "Invalid payment signature" });
            return;
        }
        const order = await Order_1.default.findOne({ transactionId: razorpay_order_id, userId: req.user.id, status: "pending" });
        if (!order) {
            res.status(404).json({ success: false, error: "Order not found or already processed" });
            return;
        }
        const user = await User_1.default.findByIdAndUpdate(req.user.id, { $addToSet: { enrolledCourses: order.courseId } }, { new: true });
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
    }
    catch {
        res.status(500).json({ success: false, error: "Failed to confirm payment" });
    }
});
// POST /api/payment/webhook — Razorpay webhook handler
router.post("/webhook", express_1.default.raw({ type: "application/json" }), (req, res) => {
    const signature = req.headers["x-razorpay-signature"];
    const expectedSignature = crypto_1.default
        .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
        .update(req.body)
        .digest("hex");
    if (expectedSignature !== signature) {
        res.status(400).json({ success: false, error: "Invalid webhook signature" });
        return;
    }
    res.json({ success: true });
});
// GET /api/payment/orders — student views their own order history
router.get("/orders", auth_1.authenticate, (0, auth_1.authorize)("user"), async (req, res) => {
    try {
        const orders = await Order_1.default.find({ userId: req.user.id }).sort({ createdAt: -1 }).lean();
        res.json({ success: true, data: orders });
    }
    catch {
        res.status(500).json({ success: false, error: "Failed to fetch orders" });
    }
});
// GET /api/payment/orders/all — requires orders:read
router.get("/orders/all", auth_1.authenticate, (0, auth_1.authorizePermission)("orders:read"), async (_req, res) => {
    try {
        const orders = await Order_1.default.find().sort({ createdAt: -1 }).lean();
        res.json({ success: true, data: orders });
    }
    catch {
        res.status(500).json({ success: false, error: "Failed to fetch orders" });
    }
});
exports.default = router;
