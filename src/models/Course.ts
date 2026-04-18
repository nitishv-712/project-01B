import mongoose, { Schema, Model } from "mongoose";
import { ICourse, CurriculumSection, VideoMeta } from "../types";

const CurriculumSchema = new Schema<CurriculumSection>(
  { section: String, lessons: Number },
  { _id: false }
);

const CourseSchema = new Schema<ICourse>(
  {
    id: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    subtitle: String,
    instructor: String,
    duration: String,
    lessons: Number,
    language: String,
    discount: Number,
    originalPrice: Number,
    price: Number,
    image: String,
    category: String,
    rating: Number,
    students: Number,
    lastUpdated: String,
    description: String,
    whatYouLearn: [String],
    curriculum: [CurriculumSchema],
    featured: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    videoPath: { type: String, default: null },  // Supabase storage path
    previewUrl: { type: String, default: null }, // public preview URL
    videoMeta: {
      title: { type: String, default: null },
      description: { type: String, default: null },
    },
  },
  { timestamps: true }
);

const Course: Model<ICourse> =
  mongoose.models.Course ?? mongoose.model<ICourse>("Course", CourseSchema);

export default Course;
