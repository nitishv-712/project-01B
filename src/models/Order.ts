import mongoose, { Schema, Model } from "mongoose";
import { IOrder } from "../types";

const OrderSchema = new Schema<IOrder>(
  {
    userId: { type: String, required: true },
    courseId: { type: String, required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ["pending", "paid", "failed"], default: "pending" },
    paymentMethod: { type: String, default: "dummy" },
    transactionId: { type: String, required: true },
  },
  { timestamps: true }
);

const Order: Model<IOrder> =
  mongoose.models.Order ?? mongoose.model<IOrder>("Order", OrderSchema);

export default Order;
