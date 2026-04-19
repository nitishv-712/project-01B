"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const mongoose_1 = __importDefault(require("mongoose"));
const MONGODB_URI = process.env.MONGODB_URI;
// ── Schemas ──────────────────────────────────────────────────────────────────
const CourseSchema = new mongoose_1.default.Schema({
    id: { type: String, required: true, unique: true },
    title: String, subtitle: String, instructor: String,
    duration: String, lessons: Number, language: String,
    discount: Number, originalPrice: Number, price: Number,
    image: String, category: String,
    rating: Number, students: Number, lastUpdated: String,
    description: String, whatYouLearn: [String],
    curriculum: [{ section: String, lessons: Number }],
    featured: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    videoPath: { type: String, default: null },
    previewUrl: { type: String, default: null },
}, { timestamps: true });
const StatsSchema = new mongoose_1.default.Schema({
    studentsEnrolled: String, videoTutorials: String,
    expertCourses: String, youtubeSubscribers: String,
}, { timestamps: true });
const TestimonialSchema = new mongoose_1.default.Schema({
    name: String, role: String, text: String,
    rating: Number, active: { type: Boolean, default: true },
}, { timestamps: true });
const Course = mongoose_1.default.models.Course ?? mongoose_1.default.model("Course", CourseSchema);
const Stats = mongoose_1.default.models.Stats ?? mongoose_1.default.model("Stats", StatsSchema);
const Testimonial = mongoose_1.default.models.Testimonial ?? mongoose_1.default.model("Testimonial", TestimonialSchema);
// ── Data ─────────────────────────────────────────────────────────────────────
const courses = [
    {
        id: "excel", title: "Excel Mastery",
        subtitle: "Master Excel from basics to advanced",
        instructor: "Satish Dhawale", duration: "13 Hours", lessons: 53,
        language: "Hinglish", discount: 51, originalPrice: 3500, price: 1699,
        image: "/excel.webp", category: "Excel & Power Tools",
        rating: 4.9, students: 65000, lastUpdated: "December 2024",
        description: "Comprehensive Excel course covering formulas, pivot tables, charts, and automation.",
        whatYouLearn: ["Formulas & Functions", "Pivot Tables", "Charts & Dashboards", "Macros & VBA"],
        curriculum: [
            { section: "Excel Fundamentals", lessons: 8 },
            { section: "Formulas & Functions", lessons: 12 },
            { section: "Pivot Tables", lessons: 10 },
            { section: "Charts & Visualization", lessons: 9 },
            { section: "Macros & Automation", lessons: 14 },
        ],
        featured: true, active: true,
        previewUrl: "https://www.youtube.com/embed/HXV3zeQKqGY",
        videoPath: null,
    },
    {
        id: "power-bi", title: "Power BI Mastery",
        subtitle: "Build stunning dashboards with Power BI",
        instructor: "Satish Dhawale", duration: "15 Hours", lessons: 60,
        language: "Hinglish", discount: 45, originalPrice: 3500, price: 1899,
        image: "/powerbi.webp", category: "Excel & Power Tools",
        rating: 4.8, students: 42000, lastUpdated: "December 2024",
        description: "Learn Power BI from scratch — data modeling, DAX, and interactive dashboards.",
        whatYouLearn: ["Data Modeling", "DAX Formulas", "Interactive Dashboards", "Power Query"],
        curriculum: [
            { section: "Power BI Basics", lessons: 10 },
            { section: "Data Modeling", lessons: 12 },
            { section: "DAX", lessons: 15 },
            { section: "Dashboards", lessons: 13 },
            { section: "Publishing & Sharing", lessons: 10 },
        ],
        featured: true, active: true,
        previewUrl: "https://www.youtube.com/embed/qDU_QEgLuAk",
        videoPath: null,
    },
    {
        id: "sql", title: "SQL Mastery",
        subtitle: "Query databases like a pro",
        instructor: "Satish Dhawale", duration: "10 Hours", lessons: 45,
        language: "Hinglish", discount: 40, originalPrice: 2999, price: 1799,
        image: "/sql.webp", category: "Data & Analytics",
        rating: 4.9, students: 38000, lastUpdated: "November 2024",
        description: "Master SQL for data analysis — from basic queries to advanced joins and window functions.",
        whatYouLearn: ["SELECT Queries", "Joins", "Aggregations", "Window Functions", "Stored Procedures"],
        curriculum: [
            { section: "SQL Basics", lessons: 10 },
            { section: "Filtering & Sorting", lessons: 8 },
            { section: "Joins", lessons: 10 },
            { section: "Aggregations", lessons: 9 },
            { section: "Advanced SQL", lessons: 8 },
        ],
        featured: true, active: true,
        previewUrl: "https://www.youtube.com/embed/HXV3zeQKqGY",
        videoPath: "sql/intro.mp4",
    },
    {
        id: "python", title: "Python Mastery",
        subtitle: "Python for data analysis and automation",
        instructor: "Satish Dhawale", duration: "18 Hours", lessons: 72,
        language: "Hinglish", discount: 50, originalPrice: 3999, price: 1999,
        image: "/python.webp", category: "Data & Analytics",
        rating: 4.8, students: 29000, lastUpdated: "January 2025",
        description: "Learn Python for data analysis using Pandas, NumPy, and Matplotlib.",
        whatYouLearn: ["Python Basics", "Pandas", "NumPy", "Matplotlib", "Data Cleaning"],
        curriculum: [
            { section: "Python Fundamentals", lessons: 15 },
            { section: "Pandas", lessons: 18 },
            { section: "NumPy", lessons: 12 },
            { section: "Visualization", lessons: 14 },
            { section: "Projects", lessons: 13 },
        ],
        featured: false, active: true,
        previewUrl: "https://www.youtube.com/embed/rfscVS0vtbw",
        videoPath: null,
    },
];
const stats = {
    studentsEnrolled: "230,000+",
    videoTutorials: "1,300+",
    expertCourses: "21+",
    youtubeSubscribers: "2M+",
};
const testimonials = [
    {
        name: "Rahul Sharma", role: "Data Analyst, Pune",
        text: "The Excel Mastery course completely transformed how I work.",
        rating: 5, active: true,
    },
    {
        name: "Priya Mehta", role: "Business Analyst, Mumbai",
        text: "Power BI course is incredibly detailed. Satish explains complex DAX concepts simply.",
        rating: 5, active: true,
    },
    {
        name: "Amit Verma", role: "SQL Developer, Bangalore",
        text: "Best SQL course in Hinglish. Covered everything from basics to advanced window functions.",
        rating: 5, active: true,
    },
];
// ── Run ───────────────────────────────────────────────────────────────────────
async function seed() {
    await mongoose_1.default.connect(MONGODB_URI);
    console.log("Connected to MongoDB");
    await Promise.all([
        Course.deleteMany({}),
        Stats.deleteMany({}),
        Testimonial.deleteMany({}),
    ]);
    console.log("Cleared existing data");
    await Promise.all([
        Course.insertMany(courses),
        Stats.create(stats),
        Testimonial.insertMany(testimonials),
    ]);
    console.log(`Seeded: ${courses.length} courses, 1 stats, ${testimonials.length} testimonials`);
    await mongoose_1.default.disconnect();
    console.log("Done");
}
seed().catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
});
