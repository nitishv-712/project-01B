import mongoose, { Schema, Model } from "mongoose";
import { ITestimonial } from "../types";

const TestimonialSchema = new Schema<ITestimonial>(
  {
    name: { type: String, required: true },
    role: String,
    text: String,
    rating: { type: Number, min: 1, max: 5 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Testimonial: Model<ITestimonial> =
  mongoose.models.Testimonial ??
  mongoose.model<ITestimonial>("Testimonial", TestimonialSchema);

export default Testimonial;
