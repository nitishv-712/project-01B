import { Router, Request, Response } from "express";
import Course from "../models/Course";
import Stats from "../models/Stats";
import Testimonial from "../models/Testimonial";
import { ICourse, IStats, ITestimonial } from "../types";

const router = Router();

const seedCourses: ICourse[] = [
  {
    id: "excel",
    title: "Excel Mastery",
    subtitle: "Master Excel from basics to advanced",
    instructor: "Satish Dhawale",
    duration: "13 Hours",
    lessons: 53,
    language: "Hinglish",
    discount: 51,
    originalPrice: 3500,
    price: 1699,
    image: "/excel.webp",
    category: "Excel & Power Tools",
    rating: 4.9,
    students: 65000,
    lastUpdated: "December 2024",
    description: "Comprehensive Excel course covering formulas, pivot tables, charts, and automation.",
    whatYouLearn: ["Formulas & Functions", "Pivot Tables", "Charts & Dashboards", "Macros & VBA"],
    curriculum: [
      { section: "Excel Fundamentals", lessons: 8 },
      { section: "Formulas & Functions", lessons: 12 },
      { section: "Pivot Tables", lessons: 10 },
      { section: "Charts & Visualization", lessons: 9 },
      { section: "Macros & Automation", lessons: 14 },
    ],
    featured: true,
    active: true,
  },
  {
    id: "power-bi",
    title: "Power BI Mastery",
    subtitle: "Build stunning dashboards with Power BI",
    instructor: "Satish Dhawale",
    duration: "15 Hours",
    lessons: 60,
    language: "Hinglish",
    discount: 45,
    originalPrice: 3500,
    price: 1899,
    image: "/powerbi.webp",
    category: "Excel & Power Tools",
    rating: 4.8,
    students: 42000,
    lastUpdated: "December 2024",
    description: "Learn Power BI from scratch — data modeling, DAX, and interactive dashboards.",
    whatYouLearn: ["Data Modeling", "DAX Formulas", "Interactive Dashboards", "Power Query"],
    curriculum: [
      { section: "Power BI Basics", lessons: 10 },
      { section: "Data Modeling", lessons: 12 },
      { section: "DAX", lessons: 15 },
      { section: "Dashboards", lessons: 13 },
      { section: "Publishing & Sharing", lessons: 10 },
    ],
    featured: true,
    active: true,
  },
  {
    id: "sql",
    title: "SQL Mastery",
    subtitle: "Query databases like a pro",
    instructor: "Satish Dhawale",
    duration: "10 Hours",
    lessons: 45,
    language: "Hinglish",
    discount: 40,
    originalPrice: 2999,
    price: 1799,
    image: "/sql.webp",
    category: "Data & Analytics",
    rating: 4.9,
    students: 38000,
    lastUpdated: "November 2024",
    description: "Master SQL for data analysis — from basic queries to advanced joins and window functions.",
    whatYouLearn: ["SELECT Queries", "Joins", "Aggregations", "Window Functions", "Stored Procedures"],
    curriculum: [
      { section: "SQL Basics", lessons: 10 },
      { section: "Filtering & Sorting", lessons: 8 },
      { section: "Joins", lessons: 10 },
      { section: "Aggregations", lessons: 9 },
      { section: "Advanced SQL", lessons: 8 },
    ],
    featured: true,
    active: true,
  },
  {
    id: "python",
    title: "Python Mastery",
    subtitle: "Python for data analysis and automation",
    instructor: "Satish Dhawale",
    duration: "18 Hours",
    lessons: 72,
    language: "Hinglish",
    discount: 50,
    originalPrice: 3999,
    price: 1999,
    image: "/python.webp",
    category: "Data & Analytics",
    rating: 4.8,
    students: 29000,
    lastUpdated: "January 2025",
    description: "Learn Python for data analysis using Pandas, NumPy, and Matplotlib.",
    whatYouLearn: ["Python Basics", "Pandas", "NumPy", "Matplotlib", "Data Cleaning"],
    curriculum: [
      { section: "Python Fundamentals", lessons: 15 },
      { section: "Pandas", lessons: 18 },
      { section: "NumPy", lessons: 12 },
      { section: "Visualization", lessons: 14 },
      { section: "Projects", lessons: 13 },
    ],
    featured: false,
    active: true,
  },
];

const seedStats: IStats = {
  studentsEnrolled: "230,000+",
  videoTutorials: "1,300+",
  expertCourses: "21+",
  youtubeSubscribers: "2M+",
};

const seedTestimonials: ITestimonial[] = [
  {
    name: "Rahul Sharma",
    role: "Data Analyst, Pune",
    text: "The Excel Mastery course completely transformed how I work.",
    rating: 5,
    active: true,
  },
  {
    name: "Priya Mehta",
    role: "Business Analyst, Mumbai",
    text: "Power BI course is incredibly detailed. Satish explains complex DAX concepts simply.",
    rating: 5,
    active: true,
  },
  {
    name: "Amit Verma",
    role: "SQL Developer, Bangalore",
    text: "Best SQL course in Hinglish. Covered everything from basics to advanced window functions.",
    rating: 5,
    active: true,
  },
];

// GET /api/seed
router.get("/", async (_req: Request, res: Response) => {
  try {
    await Promise.all([
      Course.deleteMany({}),
      Stats.deleteMany({}),
      Testimonial.deleteMany({}),
    ]);

    await Promise.all([
      Course.insertMany(seedCourses),
      Stats.create(seedStats),
      Testimonial.insertMany(seedTestimonials),
    ]);

    res.json({
      success: true,
      message: "Database seeded successfully",
      inserted: {
        courses: seedCourses.length,
        stats: 1,
        testimonials: seedTestimonials.length,
      },
    });
  } catch {
    res.status(500).json({ success: false, error: "Seeding failed" });
  }
});

export default router;
