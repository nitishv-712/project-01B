export interface CurriculumSection {
  section: string;
  lessons: number;
}

export type OrderStatus = 'pending' | 'paid' | 'failed';

export interface ICourse {
  id: string;
  title: string;
  subtitle: string;
  instructor: string;
  duration: string;
  lessons: number;
  language: string;
  discount: number;
  originalPrice: number;
  price: number;
  image: string;
  category: string;
  rating: number;
  students: number;
  lastUpdated: string;
  description: string;
  whatYouLearn: string[];
  curriculum: CurriculumSection[];
  featured: boolean;
  active: boolean;
}

export interface IOrder {
  userId: string;
  courseId: string;        // course id slug
  amount: number;          // in INR
  status: OrderStatus;
  paymentMethod: string;   // 'dummy' | 'razorpay' (future)
  transactionId: string;   // dummy id or razorpay payment_id
}

export type Role = 'admin' | 'user';

export interface IUser {
  name: string;
  email: string;
  password: string;
  role: Role;
  enrolledCourses: string[]; // course id slugs e.g. ['excel', 'sql']
  phone?: string;
  avatar?: string; // URL or relative path
  verified: boolean;
}

export interface JwtPayload {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface IStats {
  studentsEnrolled: string;
  videoTutorials: string;
  expertCourses: string;
  youtubeSubscribers: string;
}

export interface ITestimonial {
  name: string;
  role: string;
  text: string;
  rating: number;
  active: boolean;
}
