# Frontend Integration Guide

Base URL: `https://your-api.vercel.app/api`

All authenticated requests need:
```
Authorization: Bearer <token>
```

Token is returned from `/api/auth/login` or `/api/auth/register`. Store it in `localStorage` or a state manager.

---

## TypeScript Types

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
  id: string
  title: string
  subtitle: string
  instructor: string
  duration: string
  lessons: number
  language: string
  discount: number
  originalPrice: number
  price: number
  image: string
  category: string
  rating: number
  students: number
  lastUpdated: string
  description: string
  whatYouLearn: string[]
  curriculum: CurriculumSection[]
  featured: boolean
  active: boolean
  videoPath?: string       // Bunny Stream videoId — never use directly, always call /api/upload/video-url
  previewUrl?: string      // public preview URL e.g. YouTube embed
  videoMeta?: VideoMeta
  createdAt: string
  updatedAt: string
}

interface User {
  _id: string
  name: string
  email: string
  role: Role
  permissions: Permission[]
  enrolledCourses: string[]
  phone?: string
  avatar?: string
  verified: boolean
  createdAt: string
  updatedAt: string
}

interface Order {
  _id: string
  userId: string
  courseId: string
  amount: number           // INR
  status: OrderStatus
  paymentMethod: string
  transactionId: string
  createdAt: string
  updatedAt: string
}
```

---

## Auth

### Register
```ts
const res = await fetch("/api/auth/register", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name: string, email: string, password: string }),
})
const { data } = await res.json()
// data: { token, name, email, role: "user" }
```

### Login
```ts
const res = await fetch("/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: string, password: string }),
})
const { data } = await res.json()
// data: { token, name, email, role, permissions }
```

### Get current user
```ts
const res = await fetch("/api/auth/me", {
  headers: { Authorization: `Bearer ${token}` },
})
const { data } = await res.json()
// data: { id, name, email, role, permissions }
```

### Get enrolled courses
```ts
const res = await fetch("/api/auth/my-courses", {
  headers: { Authorization: `Bearer ${token}` },
})
const { data } = await res.json()
// data: Course[]
```

### Update profile
```ts
const res = await fetch("/api/auth/profile", {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({ name?: string, phone?: string, avatar?: string }),
})
const { data } = await res.json()
// data: User
```

---

## Razorpay Payment

Add the Razorpay checkout script to your `index.html`:
```html
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
```

TypeScript type for `window.Razorpay` — add to a `global.d.ts` in your frontend:
```ts
interface RazorpayOptions {
  key: string
  amount: number
  currency: string
  name?: string
  description?: string
  order_id: string
  prefill?: { name?: string; email?: string; contact?: string }
  handler: (response: {
    razorpay_order_id: string
    razorpay_payment_id: string
    razorpay_signature: string
  }) => void
  modal?: { ondismiss?: () => void }
}

interface Window {
  Razorpay: new (options: RazorpayOptions) => { open: () => void }
}
```

### Full buy flow
```ts
async function buyCourse(courseId: string, token: string, user: { name: string; email: string }) {
  // 1. Create Razorpay order on backend
  const initRes = await fetch("/api/payment/initiate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ courseId }),
  })
  const { data } = await initRes.json()
  // data: { orderId, razorpayOrderId, amount, currency, key, courseId, courseTitle }

  // 2. Open Razorpay checkout modal
  const rzp = new window.Razorpay({
    key: data.key,
    amount: data.amount,           // paise
    currency: data.currency,       // "INR"
    name: "Your Platform Name",
    description: data.courseTitle,
    order_id: data.razorpayOrderId,
    prefill: { name: user.name, email: user.email },
    handler: async (response) => {
      // 3. Verify signature and enroll
      const confirmRes = await fetch("/api/payment/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
        }),
      })
      const result = await confirmRes.json()
      // result.data: { enrolled: true, courseId, transactionId, amount }
      if (result.success) {
        // redirect to course or show success
      }
    },
    modal: {
      ondismiss: () => console.log("Payment cancelled"),
    },
  })
  rzp.open()
}
```

### View order history
```ts
const res = await fetch("/api/payment/orders", {
  headers: { Authorization: `Bearer ${token}` },
})
const { data } = await res.json()
// data: Order[]
```

---

## Courses

### Get all active courses (public)
```ts
const res = await fetch("/api/courses")
const { data } = await res.json()
// data: Course[]
```

### Get single course (public)
```ts
const res = await fetch(`/api/courses/${courseId}`)
const { data } = await res.json()
// data: Course
```

---

## Video Streaming (Bunny Stream)

Videos are hosted on Bunny Stream. Never use `course.videoPath` directly — it stores the internal `videoId`. Always call `/api/upload/video-url` to get the embed/stream URLs.

```ts
async function getVideoUrls(courseId: string, token: string) {
  const res = await fetch("/api/upload/video-url", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ courseId }),
  })
  const { data } = await res.json()
  // data: { embedUrl: string, streamUrl: string }
  return data
}
```

**embedUrl** — use inside an `<iframe>` (recommended, handles player UI automatically):
```tsx
const { embedUrl } = await getVideoUrls(courseId, token)

<iframe
  src={embedUrl}
  allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
  allowFullScreen
  style={{ width: "100%", aspectRatio: "16/9", border: "none" }}
/>
```

**streamUrl** — HLS `.m3u8` URL, use with a custom player like HLS.js or Video.js:
```ts
import Hls from "hls.js"

const { streamUrl } = await getVideoUrls(courseId, token)

if (Hls.isSupported()) {
  const hls = new Hls()
  hls.loadSource(streamUrl)
  hls.attachMedia(videoElement)
} else {
  // Safari supports HLS natively
  videoElement.src = streamUrl
}
```

---

## Avatar Upload

```ts
async function uploadAvatar(file: File, token: string): Promise<string> {
  const form = new FormData()
  form.append("avatar", file)

  const res = await fetch("/api/upload/avatar", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })
  const { data } = await res.json()
  // data: { url: string }
  return data.url
}
```

Accepted: `image/jpeg`, `image/png`, `image/webp` — max 5 MB.

---

## Admin — Course Image Upload

Requires permission `media:upload`.

```ts
async function uploadCourseImage(file: File, token: string): Promise<string> {
  const form = new FormData()
  form.append("image", file)

  const res = await fetch("/api/upload/course-image", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })
  const { data } = await res.json()
  // data: { url: string }
  return data.url
}
```

---

## Admin — Course Video Upload

Requires permission `media:upload`. Max 500 MB. Accepted: `video/mp4`, `video/webm`, `video/quicktime`.

```ts
async function uploadCourseVideo(
  file: File,
  courseId: string,
  token: string,
  meta?: { title?: string; description?: string }
) {
  const form = new FormData()
  form.append("video", file)
  form.append("courseId", courseId)
  if (meta?.title) form.append("title", meta.title)
  if (meta?.description) form.append("description", meta.description)

  const res = await fetch("/api/upload/course-video", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })
  const { data } = await res.json()
  // data: { courseId, videoUrl, size, mimetype, originalName }
  return data
}
```

For large files, show upload progress using `XMLHttpRequest`:
```ts
function uploadCourseVideoWithProgress(
  file: File,
  courseId: string,
  token: string,
  onProgress: (percent: number) => void
): Promise<{ videoUrl: string }> {
  return new Promise((resolve, reject) => {
    const form = new FormData()
    form.append("video", file)
    form.append("courseId", courseId)

    const xhr = new XMLHttpRequest()
    xhr.open("POST", "/api/upload/course-video")
    xhr.setRequestHeader("Authorization", `Bearer ${token}`)

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }

    xhr.onload = () => {
      const result = JSON.parse(xhr.responseText)
      result.success ? resolve(result.data) : reject(new Error(result.error))
    }

    xhr.onerror = () => reject(new Error("Upload failed"))
    xhr.send(form)
  })
}
```

---

## Admin — Delete Course Video

Requires permission `media:delete`.

```ts
await fetch(`/api/upload/course-video/${courseId}`, {
  method: "DELETE",
  headers: { Authorization: `Bearer ${token}` },
})
```

---

## Stats (public)

```ts
const res = await fetch("/api/stats")
const { data } = await res.json()
// data: { studentsEnrolled, videoTutorials, expertCourses, youtubeSubscribers }
```

---

## Testimonials (public)

```ts
const res = await fetch("/api/testimonials")
const { data } = await res.json()
// data: Testimonial[]  — only active ones
```

---

## Error Handling

Every response has `success: boolean`. On failure, `error` contains the message.

```ts
async function apiFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, options)
  const json = await res.json()
  if (!json.success) throw new Error(json.error ?? "Request failed")
  return json.data
}
```

Common errors to handle in UI:

| Status | Error | UI action |
|--------|-------|-----------|
| `401` | `No token provided` / `Invalid or expired token` | Redirect to login |
| `403` | `Forbidden: insufficient role` | Show "Access denied" |
| `400` | `Already enrolled in this course` | Show "Already enrolled" state |
| `400` | `Invalid payment signature` | Show payment failure message |
| `404` | `Course not found` | Show 404 page |
| `413` | Request entity too large | Show "File too large" |
