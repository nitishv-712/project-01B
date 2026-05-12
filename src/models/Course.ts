import mongoose, { Schema, Model } from "mongoose";
import { ICourse, CurriculumSection, Lesson } from "../types";

const LessonSchema = new Schema<Lesson>(
  {
    lessonId: { type: String, required: true },
    title: { type: String, required: true },
    duration: { type: String, default: null },
    videoId: { type: String, default: null },
  },
  { _id: false }
);

const CurriculumSchema = new Schema<CurriculumSection>(
  {
    section: { type: String, required: true },
    lessons: { type: [LessonSchema], default: [] },
  },
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
    previewUrl: { type: String, default: null },
  },
  { timestamps: true }
);

const Course: Model<ICourse> =
  mongoose.models.Course ?? mongoose.model<ICourse>("Course", CourseSchema);

export default Course;
