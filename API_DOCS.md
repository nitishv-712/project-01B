# Backend API Documentation

Base URL: `/api`

All authenticated routes require:
```
Authorization: Bearer <token>
```

All responses follow the shape:
```ts
{ success: boolean, data?: any, error?: string, message?: string }
```

---

## Global Errors

These apply to **every authenticated route** and are not repeated per-route.

| Status | Error | Cause |
|--------|-------|-------|
| `401` | `No token provided` | `Authorization` header is missing |
| `401` | `Invalid or expired token` | Token is malformed, tampered, or past 7-day expiry |
| `401` | `Not authenticated` | Token passed but `req.user` could not be set |
| `403` | `Forbidden: insufficient role` | Authenticated but wrong role (e.g. `user` hitting an `admin` route) |
| `403` | `Forbidden: requires '<permission>' permission` | Admin is missing the specific permission for that route |
| `500` | `<err.message>` or `Internal server error` | Unhandled exception caught by global error handler |

---

## Auth Roles & Permissions

| Role | Access |
|------|--------|
| `user` | Student — enroll, view courses, manage own profile |
| `admin` | Admin — scoped by permissions granted by superadmin |
| `superadmin` | Full access to everything |

Available permissions for admins:
```
courses:read, courses:create, courses:update, courses:delete
users:read, users:update, users:delete
testimonials:read, testimonials:create, testimonials:update, testimonials:delete
orders:read
stats:read, stats:update
media:upload, media:delete
profile:manage_own
```

---

## Data Types

```ts
type Role = "superadmin" | "admin" | "user"
type OrderStatus = "pending" | "paid" | "failed"

type Permission =
  | "courses:read" | "courses:create" | "courses:update" | "courses:delete"
  | "users:read" | "users:update" | "users:delete"
  | "testimonials:read" | "testimonials:create" | "testimonials:update" | "testimonials:delete"
  | "orders:read" | "stats:read" | "stats:update"
  | "media:upload" | "media:delete" | "profile:manage_own"

interface CurriculumSection {
  section: string
  lessons: number
}

interface VideoMeta {
  title?: string
  description?: string
}

interface Course {
  _id: string
  id: string                      // slug e.g. "excel"
  title: string
  subtitle: string
  instructor: string
  duration: string                // e.g. "13 Hours"
  lessons: number
  language: string
  discount: number                // percentage
  originalPrice: number           // INR
  price: number                   // INR
  image: string                   // path or URL
  category: string
  rating: number
  students: number
  lastUpdated: string
  description: string
  whatYouLearn: string[]
  curriculum: CurriculumSection[]
  featured: boolean
  active: boolean
  videoPath?: string              // Bunny CDN public URL (access controlled via signed URLs)
  previewUrl?: string             // public preview URL
  videoMeta?: VideoMeta
  createdAt: string               // ISO date
  updatedAt: string               // ISO date
}

interface User {
  _id: string
  name: string
  email: string
  role: Role
  permissions: Permission[]       // only relevant for role: "admin"
  enrolledCourses: string[]       // array of course id slugs
  phone?: string
  avatar?: string                 // URL
  verified: boolean
  createdAt: string
  updatedAt: string
  // password is never returned
}

interface Order {
  _id: string
  userId: string
  courseId: string                // course id slug
  amount: number                  // INR
  status: OrderStatus
  paymentMethod: string           // "razorpay"
  transactionId: string           // razorpay payment_id after confirm
  createdAt: string
  updatedAt: string
}

interface Stats {
  _id: string
  studentsEnrolled: string        // e.g. "230,000+"
  videoTutorials: string
  expertCourses: string
  youtubeSubscribers: string
}

interface Testimonial {
  _id: string
  name: string
  role: string                    // e.g. "Data Analyst, Pune"
  text: string
  rating: number                  // 1–5
  active: boolean
}
```

---

## /api/auth

### POST /api/auth/register
Public. Creates a `user` role account.

**Request body:**
```ts
{
  name: string       // required
  email: string      // required
  password: string   // required
}
```

**Response `201`:**
```ts
{
  success: true,
  data: {
    token: string
    name: string
    email: string
    role: "user"
  }
}
```

**Errors:**

| Status | Error |
|--------|-------|
| `400` | `Email already registered` |
| `400` | `Registration failed` |

---

### POST /api/auth/login
Public.

**Request body:**
```ts
{
  email: string      // required
  password: string   // required
}
```

**Response `200`:**
```ts
{
  success: true,
  data: {
    token: string
    name: string
    email: string
    role: Role
    permissions: Permission[]
  }
}
```

**Errors:**

| Status | Error |
|--------|-------|
| `401` | `Invalid credentials` |
| `500` | `Login failed` |

---

### POST /api/auth/create-admin
Auth: `superadmin`

**Request body:**
```ts
{
  name: string       // required
  email: string      // required
  password: string   // required
}
```

**Response `201`:**
```ts
{
  success: true,
  data: {
    name: string
    email: string
    role: "admin"
  }
}
```

**Errors:**

| Status | Error |
|--------|-------|
| `400` | `Email already registered` |
| `400` | `Failed to create admin` |

---

### GET /api/auth/me
Auth: any authenticated user

**Response `200`:**
```ts
{
  success: true,
  data: {
    id: string
    name: string
    email: string
    role: Role
    permissions: Permission[]
  }
}
```

---

### GET /api/auth/my-courses
Auth: `user`

**Response `200`:**
```ts
{
  success: true,
  data: Course[]     // only active courses the user is enrolled in
}
```

**Errors:**

| Status | Error |
|--------|-------|
| `404` | `User not found` |
| `500` | `Failed to fetch enrolled courses` |

---

### PATCH /api/auth/profile
Auth: any authenticated user (`user` always allowed; `admin` requires `profile:manage_own`)

**Request body** (all optional, send only what you want to update):
```ts
{
  name?: string
  phone?: string
  avatar?: string    // URL string
}
```

**Response `200`:**
```ts
{
  success: true,
  data: User         // full user object without password
}
```

**Errors:**

| Status | Error |
|--------|-------|
| `403` | `Forbidden: requires 'profile:manage_own' permission` |
| `404` | `User not found` |
| `400` | `Failed to update profile` |

---

## /api/payment

### POST /api/payment/initiate
Auth: `user`

Creates a Razorpay order. Returns data needed to open the Razorpay checkout modal.

**Request body:**
```ts
{
  courseId: string   // required — course id slug e.g. "excel"
}
```

**Response `201`:**
```ts
{
  success: true,
  data: {
    orderId: string          // internal MongoDB Order _id
    razorpayOrderId: string  // Razorpay order id — pass to checkout as order_id
    amount: number           // in paise (price × 100)
    currency: "INR"
    key: string              // RAZORPAY_KEY_ID — pass to checkout
    courseId: string
    courseTitle: string
  }
}
```

**Errors:**

| Status | Error |
|--------|-------|
| `400` | `Already enrolled in this course` |
| `404` | `Course not found` |
| `404` | `User not found` |
| `500` | `Failed to initiate payment` |

---

### POST /api/payment/confirm
Auth: `user`

Verifies Razorpay signature, enrolls the student, marks order as paid.

**Request body:**
```ts
{
  razorpay_order_id: string    // from Razorpay handler response
  razorpay_payment_id: string  // from Razorpay handler response
  razorpay_signature: string   // from Razorpay handler response
}
```

**Response `200`:**
```ts
{
  success: true,
  data: {
    enrolled: true
    courseId: string
    transactionId: string   // razorpay_payment_id
    amount: number          // INR
  }
}
```

**Errors:**

| Status | Error |
|--------|-------|
| `400` | `Invalid payment signature` |
| `404` | `Order not found or already processed` |
| `404` | `User not found` |
| `500` | `Failed to confirm payment` |

---

### POST /api/payment/webhook
No auth. Validates `x-razorpay-signature` header using `RAZORPAY_WEBHOOK_SECRET`.

**Headers:**
```
x-razorpay-signature: string
Content-Type: application/json (raw body)
```

**Response `200`:**
```ts
{ success: true }
```

**Errors:**

| Status | Error |
|--------|-------|
| `400` | `Invalid webhook signature` |

---

### GET /api/payment/orders
Auth: `user`

Returns the authenticated user's own order history.

**Response `200`:**
```ts
{
  success: true,
  data: Order[]    // sorted by createdAt desc
}
```

**Errors:**

| Status | Error |
|--------|-------|
| `500` | `Failed to fetch orders` |

---

### GET /api/payment/orders/all
Auth: permission `orders:read`

Returns all orders across all users.

**Response `200`:**
```ts
{
  success: true,
  data: Order[]    // sorted by createdAt desc
}
```

**Errors:**

| Status | Error |
|--------|-------|
| `500` | `Failed to fetch orders` |

---

## /api/courses

### GET /api/courses
Public. Returns all active courses.

**Response `200`:**
```ts
{
  success: true,
  data: Course[]
}
```

**Errors:**

| Status | Error |
|--------|-------|
| `500` | `Failed to fetch courses` |

---

### GET /api/courses/all
Auth: permission `courses:read`. Returns all courses including inactive.

**Response `200`:**
```ts
{
  success: true,
  data: Course[]
}
```

**Errors:**

| Status | Error |
|--------|-------|
| `500` | `Failed to fetch courses` |

---

### GET /api/courses/:id
Public. `:id` is the course slug (e.g. `excel`).

**Response `200`:**
```ts
{
  success: true,
  data: Course
}
```

**Errors:**

| Status | Error |
|--------|-------|
| `404` | `Course not found` |
| `500` | `Failed to fetch course` |

---

### POST /api/courses
Auth: permission `courses:create`

**Request body:**
```ts
{
  id: string                  // required, unique slug
  title: string               // required
  subtitle?: string
  instructor?: string
  duration?: string
  lessons?: number
  language?: string
  discount?: number
  originalPrice?: number
  price?: number
  image?: string
  category?: string
  rating?: number
  students?: number
  lastUpdated?: string
  description?: string
  whatYouLearn?: string[]
  curriculum?: CurriculumSection[]
  featured?: boolean
  active?: boolean
  previewUrl?: string
  videoMeta?: VideoMeta
}
```

**Response `201`:**
```ts
{
  success: true,
  data: Course
}
```

**Errors:**

| Status | Error |
|--------|-------|
| `400` | `Failed to create course` — validation error or duplicate `id` slug |

---

### PUT /api/courses/:id
Auth: permission `courses:update`. Full update of a course by slug.

**Request body:** same shape as POST (all fields optional)

**Response `200`:**
```ts
{
  success: true,
  data: Course
}
```

**Errors:**

| Status | Error |
|--------|-------|
| `404` | `Course not found` |
| `400` | `Failed to update course` |

---

### PATCH /api/courses/:id/toggle
Auth: permission `courses:update`. Toggles `active` boolean.

**Response `200`:**
```ts
{
  success: true,
  data: {
    id: string
    active: boolean
  }
}
```

**Errors:**

| Status | Error |
|--------|-------|
| `404` | `Course not found` |
| `500` | `Failed to toggle course` |

---

### DELETE /api/courses/:id
Auth: permission `courses:delete`

**Response `200`:**
```ts
{
  success: true,
  message: "Course deleted"
}
```

**Errors:**

| Status | Error |
|--------|-------|
| `404` | `Course not found` |
| `500` | `Failed to delete course` |

---

## /api/users

### GET /api/users
Auth: permission `users:read`. Returns all users with role `user`.

**Response `200`:**
```ts
{
  success: true,
  data: User[]    // password excluded
}
```

**Errors:**

| Status | Error |
|--------|-------|
| `500` | `Failed to fetch users` |

---

### GET /api/users/:id
Auth: permission `users:read`

**Response `200`:**
```ts
{
  success: true,
  data: User      // password excluded
}
```

**Errors:**

| Status | Error |
|--------|-------|
| `404` | `User not found` |
| `500` | `Failed to fetch user` |

---

### PATCH /api/users/:id/verify
Auth: permission `users:update`. Toggles `verified` boolean.

**Response `200`:**
```ts
{
  success: true,
  data: {
    _id: string
    verified: boolean
  }
}
```

**Errors:**

| Status | Error |
|--------|-------|
| `404` | `User not found` |
| `500` | `Failed to toggle verification` |

---

### PATCH /api/users/:id/unenroll
Auth: permission `users:update`. Removes a course from user's `enrolledCourses`.

**Request body:**
```ts
{
  courseId: string   // required — course id slug
}
```

**Response `200`:**
```ts
{
  success: true,
  data: {
    enrolledCourses: string[]
  }
}
```

**Errors:**

| Status | Error |
|--------|-------|
| `404` | `User not found` |
| `500` | `Failed to unenroll user` |

---

### DELETE /api/users/:id
Auth: permission `users:delete`

**Response `200`:**
```ts
{
  success: true,
  message: "User deleted"
}
```

**Errors:**

| Status | Error |
|--------|-------|
| `404` | `User not found` |
| `500` | `Failed to delete user` |

---

## /api/admin

### GET /api/admin/dashboard
Auth: `admin` or `superadmin`. `user` role gets `403 Forbidden: insufficient role`.

**Response `200`:**
```ts
{
  success: true,
  data: {
    courses: {
      total: number
      active: number
      inactive: number
    }
    students: {
      total: number
      verified: number
      unverified: number
    }
    orders: {
      total: number
      paid: number
      pending: number
      revenue: number       // total INR from paid orders
    }
    testimonials: {
      total: number
      active: number
      inactive: number
    }
    recentOrders: Order[]   // last 5 paid orders
    recentStudents: User[]  // last 5 registered users (password excluded)
    admins: {
      total: number
    }
  }
}
```

**Errors:**

| Status | Error |
|--------|-------|
| `500` | `Failed to fetch dashboard data` |

---

## /api/superadmin

### GET /api/superadmin/admins
Auth: `superadmin`. Lists all admin accounts.

**Response `200`:**
```ts
{
  success: true,
  data: User[]    // role: "admin", password excluded
}
```

**Errors:**

| Status | Error |
|--------|-------|
| `500` | `Failed to fetch admins` |

---

### GET /api/superadmin/admins/:id
Auth: `superadmin`

**Response `200`:**
```ts
{
  success: true,
  data: User      // password excluded
}
```

**Errors:**

| Status | Error |
|--------|-------|
| `404` | `Admin not found` |
| `500` | `Failed to fetch admin` |

---

### PATCH /api/superadmin/admins/:id/permissions
Auth: `superadmin`. Replaces the admin's full permissions array.

**Request body:**
```ts
{
  permissions: Permission[]   // required — full replacement array
}
```

**Response `200`:**
```ts
{
  success: true,
  data: {
    _id: string
    name: string
    email: string
    permissions: Permission[]
  }
}
```

**Errors:**

| Status | Error |
|--------|-------|
| `400` | `Invalid permissions: <comma-separated list>` — one or more values not in the permissions enum |
| `404` | `Admin not found` |
| `500` | `Failed to update permissions` |

---

### PATCH /api/superadmin/admins/:id/grant
Auth: `superadmin`. Adds a single permission.

**Request body:**
```ts
{
  permission: Permission   // required
}
```

**Response `200`:**
```ts
{
  success: true,
  data: {
    _id: string
    permissions: Permission[]
  }
}
```

**Errors:**

| Status | Error |
|--------|-------|
| `400` | `Invalid permission: <value>` |
| `404` | `Admin not found` |
| `500` | `Failed to grant permission` |

---

### PATCH /api/superadmin/admins/:id/revoke
Auth: `superadmin`. Removes a single permission.

**Request body:**
```ts
{
  permission: Permission   // required
}
```

**Response `200`:**
```ts
{
  success: true,
  data: {
    _id: string
    permissions: Permission[]
  }
}
```

**Errors:**

| Status | Error |
|--------|-------|
| `404` | `Admin not found` |
| `500` | `Failed to revoke permission` |

---

### DELETE /api/superadmin/admins/:id
Auth: `superadmin`

**Response `200`:**
```ts
{
  success: true,
  message: "Admin deleted"
}
```

**Errors:**

| Status | Error |
|--------|-------|
| `404` | `Admin not found` |
| `500` | `Failed to delete admin` |

---

### GET /api/superadmin/permissions
Auth: `superadmin`. Returns all available permissions and preset bundles.

**Response `200`:**
```ts
{
  success: true,
  data: {
    permissions: Permission[]
    presets: {
      full_admin: Permission[]
      course_manager: Permission[]
      content_editor: Permission[]
      user_manager: Permission[]
      viewer: Permission[]
    }
  }
}
```

---

## /api/stats

### GET /api/stats
Public.

**Response `200`:**
```ts
{
  success: true,
  data: {
    _id: string
    studentsEnrolled: string    // e.g. "230,000+"
    videoTutorials: string
    expertCourses: string
    youtubeSubscribers: string
  }
}
```

**Errors:**

| Status | Error |
|--------|-------|
| `500` | `Failed to fetch stats` |

---

### PUT /api/stats
Auth: permission `stats:update`. Creates or replaces the stats document.

**Request body:**
```ts
{
  studentsEnrolled?: string
  videoTutorials?: string
  expertCourses?: string
  youtubeSubscribers?: string
}
```

**Response `200`:**
```ts
{
  success: true,
  data: Stats
}
```

**Errors:**

| Status | Error |
|--------|-------|
| `400` | `Failed to update stats` |

---

## /api/testimonials

### GET /api/testimonials
Public. Returns only active testimonials.

**Response `200`:**
```ts
{
  success: true,
  data: Testimonial[]
}
```

**Errors:**

| Status | Error |
|--------|-------|
| `500` | `Failed to fetch testimonials` |

---

### GET /api/testimonials/all
Auth: permission `testimonials:read`. Returns all including inactive.

**Response `200`:**
```ts
{
  success: true,
  data: Testimonial[]
}
```

**Errors:**

| Status | Error |
|--------|-------|
| `500` | `Failed to fetch testimonials` |

---

### POST /api/testimonials
Auth: permission `testimonials:create`

**Request body:**
```ts
{
  name: string      // required
  role: string      // required — e.g. "Data Analyst, Pune"
  text: string      // required
  rating: number    // required — 1 to 5
  active?: boolean  // default: true
}
```

**Response `201`:**
```ts
{
  success: true,
  data: Testimonial
}
```

**Errors:**

| Status | Error |
|--------|-------|
| `400` | `Failed to create testimonial` |

---

### PUT /api/testimonials/:id
Auth: permission `testimonials:update`. Full update.

**Request body:** same shape as POST (all optional)

**Response `200`:**
```ts
{
  success: true,
  data: Testimonial
}
```

**Errors:**

| Status | Error |
|--------|-------|
| `404` | `Testimonial not found` |
| `400` | `Failed to update testimonial` |

---

### PATCH /api/testimonials/:id/toggle
Auth: permission `testimonials:update`. Toggles `active` boolean.

**Response `200`:**
```ts
{
  success: true,
  data: {
    _id: string
    active: boolean
  }
}
```

**Errors:**

| Status | Error |
|--------|-------|
| `404` | `Testimonial not found` |
| `500` | `Failed to toggle testimonial` |

---

### DELETE /api/testimonials/:id
Auth: permission `testimonials:delete`

**Response `200`:**
```ts
{
  success: true,
  message: "Testimonial deleted"
}
```

**Errors:**

| Status | Error |
|--------|-------|
| `404` | `Testimonial not found` |
| `500` | `Failed to delete testimonial` |

---

## /api/upload

All upload routes use `multipart/form-data`.

**Upload middleware errors** (apply to all routes that accept a file):

| Status | Error |
|--------|-------|
| `400` | `Invalid file type. Allowed: image/jpeg, image/png, image/webp` — for image routes |
| `400` | `Invalid file type. Allowed: video/mp4, video/webm, video/quicktime` — for video routes |
| `413` | Request entity too large — file exceeds 5 MB (images) or 500 MB (videos) |

---

### POST /api/upload/avatar
Auth: `user`. Uploads user's avatar to Supabase, saves URL to user document.

**Request:** `multipart/form-data`
```
avatar: File    // required — image file (jpg, png, webp) max 5 MB
```

**Response `200`:**
```ts
{
  success: true,
  data: {
    url: string    // public Supabase URL
  }
}
```

**Errors:**

| Status | Error |
|--------|-------|
| `400` | `No file provided` |
| `500` | `Avatar upload failed` or Supabase error message |

---

### POST /api/upload/course-image
Auth: permission `media:upload`. Uploads a course thumbnail.

**Request:** `multipart/form-data`
```
image: File    // required — image file (jpg, png, webp) max 5 MB
```

**Response `200`:**
```ts
{
  success: true,
  data: {
    url: string    // public Supabase URL
  }
}
```

**Errors:**

| Status | Error |
|--------|-------|
| `400` | `No file provided` |
| `500` | `Image upload failed` or Supabase error message |

---

### POST /api/upload/course-video
Auth: permission `media:upload`. Uploads a course video to Bunny CDN. Replaces existing video if one exists.

**Request:** `multipart/form-data`
```
video: File          // required — video file (mp4, webm, mov) max 500 MB
courseId: string     // required — course id slug
title?: string       // optional — video title metadata
description?: string // optional — video description metadata
```

**Response `200`:**
```ts
{
  success: true,
  data: {
    courseId: string
    videoUrl: string       // full Bunny CDN URL
    size: number           // bytes
    mimetype: string
    originalName: string
  }
}
```

**Errors:**

| Status | Error |
|--------|-------|
| `400` | `No file provided` |
| `400` | `courseId is required` |
| `404` | `Course not found` |
| `500` | `Video upload failed` or Bunny API error message |

---

### DELETE /api/upload/course-video/:courseId
Auth: permission `media:delete`. Removes video from Bunny CDN and clears `videoPath` on the course.

**Response `200`:**
```ts
{
  success: true,
  message: "Video removed from course"
}
```

**Errors:**

| Status | Error |
|--------|-------|
| `400` | `No video attached to this course` |
| `404` | `Course not found` |
| `500` | `Failed to remove video` or Bunny API error message |

---

### POST /api/upload/video-url
Auth: `user`. Returns a Bunny CDN signed URL (1 hour expiry) to stream a course video. Only works if the user is enrolled.

**Request body:**
```ts
{
  courseId: string    // required — course id slug
}
```

**Response `200`:**
```ts
{
  success: true,
  data: {
    url: string        // Bunny CDN signed URL, valid for 1 hour
    expiresIn: 3600    // seconds
  }
}
```

**Errors:**

| Status | Error |
|--------|-------|
| `403` | `Not enrolled in this course` |
| `404` | `Video not found` |
| `500` | `Failed to get video URL` or Bunny error message |

---

### DELETE /api/upload/file
Auth: permission `media:delete`. Deletes any file from a Supabase bucket.

**Request body:**
```ts
{
  bucket: string      // required — must be a valid bucket name
  filePath: string    // required — path within the bucket
}
```

**Response `200`:**
```ts
{
  success: true,
  message: "File deleted"
}
```

**Errors:**

| Status | Error |
|--------|-------|
| `400` | `Invalid bucket` |
| `500` | `Delete failed` or Supabase error message |

---

## /api/seed

### GET /api/seed
Public. Wipes and re-seeds courses, stats, and testimonials with default data. **Do not expose in production.**

**Response `200`:**
```ts
{
  success: true,
  message: "Database seeded successfully",
  inserted: {
    courses: number
    stats: number
    testimonials: number
  }
}
```

**Errors:**

| Status | Error |
|--------|-------|
| `500` | `Seeding failed` |
