export interface CurriculumSection {
  section: string;
  lessons: number;
}

export type OrderStatus = 'pending' | 'paid' | 'failed';

export interface VideoMeta {
  title?: string;
  description?: string;
}

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
  videoPath?: string;   // Supabase storage path — private, enrolled students only
  previewUrl?: string;  // public preview URL e.g. YouTube embed — visible to all
  videoMeta?: VideoMeta; // optional title and description for the video
}

export interface IOrder {
  userId: string;
  courseId: string;        // course id slug
  amount: number;          // in INR
  status: OrderStatus;
  paymentMethod: string;   // 'dummy' | 'razorpay' (future)
  transactionId: string;   // dummy id or razorpay payment_id
}

export type Role = 'superadmin' | 'admin' | 'user';

export type Permission =
  // Courses
  | 'courses:read'
  | 'courses:create'
  | 'courses:update'
  | 'courses:delete'
  // Users (students)
  | 'users:read'
  | 'users:update'
  | 'users:delete'
  // Testimonials
  | 'testimonials:read'
  | 'testimonials:create'
  | 'testimonials:update'
  | 'testimonials:delete'
  // Orders
  | 'orders:read'
  // Stats
  | 'stats:read'
  | 'stats:update'
  // Media uploads
  | 'media:upload'
  | 'media:delete'
  // Own profile (every admin gets this by default)
  | 'profile:manage_own';

export const ALL_PERMISSIONS: Permission[] = [
  'courses:read',
  'courses:create',
  'courses:update',
  'courses:delete',
  'users:read',
  'users:update',
  'users:delete',
  'testimonials:read',
  'testimonials:create',
  'testimonials:update',
  'testimonials:delete',
  'orders:read',
  'stats:read',
  'stats:update',
  'media:upload',
  'media:delete',
  'profile:manage_own',
];

// Preset permission bundles for convenience
export const PERMISSION_PRESETS: Record<string, Permission[]> = {
  full_admin: ALL_PERMISSIONS,
  course_manager: ['courses:read', 'courses:create', 'courses:update', 'courses:delete', 'media:upload', 'media:delete', 'profile:manage_own'],
  content_editor: ['courses:read', 'courses:update', 'testimonials:read', 'testimonials:create', 'testimonials:update', 'testimonials:delete', 'media:upload', 'profile:manage_own'],
  user_manager: ['users:read', 'users:update', 'users:delete', 'orders:read', 'profile:manage_own'],
  viewer: ['courses:read', 'users:read', 'testimonials:read', 'orders:read', 'stats:read', 'profile:manage_own'],
};

export interface IUser {
  name: string;
  email: string;
  password: string;
  role: Role;
  permissions: Permission[]; // only relevant for role: 'admin'
  enrolledCourses: string[];
  phone?: string;
  avatar?: string;
  verified: boolean;
}

export interface JwtPayload {
  id: string;
  name: string;
  email: string;
  role: Role;
  permissions: Permission[];
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
