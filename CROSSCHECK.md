# API Cross-Check Reference

Use this to verify your frontend is calling the right endpoints with the right method, auth, body, and expected response.

---

## Base URL & Headers

```
Base:          http://localhost:5000
Content-Type:  application/json          (all requests except file uploads)
Authorization: Bearer <token>            (all protected routes)
```

All responses:
```json
{ "success": true,  "data": { ... } }
{ "success": false, "error": "message" }
```

---

## Token

- Stored in `localStorage` as `sc_token`
- Valid 7 days
- Payload: `{ id, name, email, role }`
- Role is either `"admin"` or `"user"`

---

## Status Codes

| Code | Meaning |
|---|---|
| 200 | OK |
| 201 | Created |
| 400 | Bad request / already exists |
| 401 | No token / invalid token |
| 403 | Wrong role |
| 404 | Not found |
| 500 | Server error |

---

## Auth — `/api/auth`

| Method | Route | Auth | Body | Returns |
|---|---|---|---|---|
| POST | `/api/auth/register` | None | `{ name, email, password }` | `{ token, name, email, role }` |
| POST | `/api/auth/login` | None | `{ email, password }` | `{ token, name, email, role }` |
| GET | `/api/auth/me` | Any | — | `{ id, name, email, role }` |
| GET | `/api/auth/my-courses` | Student | — | `Course[]` |
| PATCH | `/api/auth/profile` | Student | `{ name?, phone?, avatar? }` | Student object (no password) |
| POST | `/api/auth/create-admin` | Admin | `{ name, email, password }` | `{ name, email, role }` |

### Critical checks
- After `register` or `login` → save `data.token` to `localStorage`
- After `login` → check `data.role`: redirect `admin` → `/admin/dashboard`, `user` → `/dashboard`
- `my-courses` returns full `Course[]` — call this after payment confirm to refresh dashboard
- `profile` PATCH — only send fields you want to update, all are optional

---

## Courses — `/api/courses`

| Method | Route | Auth | Body | Returns |
|---|---|---|---|---|
| GET | `/api/courses` | None | — | `Course[]` (active only) |
| GET | `/api/courses/all` | Admin | — | `Course[]` (all including inactive) |
| GET | `/api/courses/:id` | None | — | `Course` (active only) |
| POST | `/api/courses` | Admin | Full course object | `Course` |
| PUT | `/api/courses/:id` | Admin | Partial course fields | `Course` |
| PATCH | `/api/courses/:id/toggle` | Admin | — | `{ id, active }` |
| DELETE | `/api/courses/:id` | Admin | — | `{ message }` |

### Critical checks
- `:id` is the **slug** (e.g. `excel`, `power-bi`) — NOT MongoDB `_id`
- `GET /api/courses` filters `active: true` — use `/api/courses/all` in admin panel
- `featured: true` courses go on homepage — filter client-side from the full list
- `image` field is a Supabase public URL after upload, or a local path like `/excel.webp`
- No `enrollUrl` field — it was removed

---

## Payment — `/api/payment`

| Method | Route | Auth | Body | Returns |
|---|---|---|---|---|
| POST | `/api/payment/initiate` | Student | `{ courseId }` | `{ orderId, transactionId, amount, courseId, courseTitle, paymentMethod }` |
| POST | `/api/payment/confirm` | Student | `{ transactionId }` | `{ enrolled: true, courseId, transactionId, amount }` |
| GET | `/api/payment/orders` | Student | — | `Order[]` |
| GET | `/api/payment/orders/all` | Admin | — | `Order[]` |

### Critical checks
- Always call `initiate` first → store `transactionId` in state
- Call `confirm` with that same `transactionId` → student is enrolled
- After `confirm` succeeds → re-fetch `GET /api/auth/my-courses` to update dashboard
- `initiate` returns `400` if student is already enrolled — handle this gracefully
- `courseId` in body is the slug e.g. `"excel"` — not `_id`

### Correct flow
```
1. POST /api/payment/initiate  { courseId: "excel" }
   → save transactionId

2. Show payment UI

3. POST /api/payment/confirm   { transactionId }
   → { enrolled: true }

4. GET /api/auth/my-courses
   → refresh dashboard
```

---

## Users — `/api/users` (Admin only)

| Method | Route | Auth | Body | Returns |
|---|---|---|---|---|
| GET | `/api/users` | Admin | — | `Student[]` (no passwords) |
| GET | `/api/users/:id` | Admin | — | `Student` (no password) |
| PATCH | `/api/users/:id/verify` | Admin | — | `{ _id, verified }` |
| PATCH | `/api/users/:id/unenroll` | Admin | `{ courseId }` | `{ enrolledCourses }` |
| DELETE | `/api/users/:id` | Admin | — | `{ message }` |

### Critical checks
- `:id` here is MongoDB `_id` — not a slug
- `verify` toggles — call once to verify, call again to unverify
- `unenroll` body needs `courseId` as slug e.g. `"excel"`
- Password is never returned — `select('-password')` is applied

---

## Stats — `/api/stats`

| Method | Route | Auth | Body | Returns |
|---|---|---|---|---|
| GET | `/api/stats` | None | — | `Stats` |
| PUT | `/api/stats` | Admin | `{ studentsEnrolled?, videoTutorials?, expertCourses?, youtubeSubscribers? }` | `Stats` |

### Critical checks
- All stats values are **pre-formatted strings** — render directly, no formatting needed
- `PUT` uses upsert — safe to call even if no stats document exists yet

---

## Testimonials — `/api/testimonials`

| Method | Route | Auth | Body | Returns |
|---|---|---|---|---|
| GET | `/api/testimonials` | None | — | `Testimonial[]` (active only) |
| GET | `/api/testimonials/all` | Admin | — | `Testimonial[]` (all) |
| POST | `/api/testimonials` | Admin | `{ name, role, text, rating, active? }` | `Testimonial` |
| PUT | `/api/testimonials/:id` | Admin | Partial testimonial fields | `Testimonial` |
| PATCH | `/api/testimonials/:id/toggle` | Admin | — | `{ _id, active }` |
| DELETE | `/api/testimonials/:id` | Admin | — | `{ message }` |

### Critical checks
- `:id` is MongoDB `_id` — not a slug
- `rating` must be 1–5
- `toggle` flips `active` — use for show/hide on public pages

---

## Upload — `/api/upload`

All upload endpoints use `multipart/form-data`. Do NOT set `Content-Type` manually — let the browser set it with the boundary.

| Method | Route | Auth | Field | Max Size | Returns |
|---|---|---|---|---|---|
| POST | `/api/upload/avatar` | Student | `avatar` (image) | 5MB | `{ url }` — also saves to user.avatar |
| POST | `/api/upload/course-image` | Admin | `image` (image) | 5MB | `{ url }` |
| POST | `/api/upload/course-video` | Admin | `video` (video) + `courseId?` | 500MB | `{ path }` |
| POST | `/api/upload/video-url` | Student | JSON: `{ videoPath, courseId }` | — | `{ url, expiresIn: 3600 }` |
| DELETE | `/api/upload/file` | Admin | JSON: `{ bucket, filePath }` | — | `{ message }` |

### Critical checks
- `avatar` upload auto-saves the URL to the user document — no separate PATCH needed
- `course-image` returns a **public URL** — store this in the course `image` field
- `course-video` returns a **storage path** (not a URL) — store this path in your lesson/course data
- `video-url` returns a **signed URL** valid for 1 hour — request it fresh each time a student opens a video
- `video-url` checks enrollment — returns `403` if student is not enrolled in `courseId`
- Allowed image types: `jpeg`, `png`, `webp`
- Allowed video types: `mp4`, `webm`, `quicktime`
- Valid buckets for DELETE: `avatars`, `courses`, `videos`

### Upload example
```ts
const form = new FormData();
form.append('avatar', file);  // file from <input type="file">

await fetch(`${API}/api/upload/avatar`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  // NO Content-Type header here
  body: form,
});
```

---

## TypeScript Types (copy to frontend)

```ts
export type Role = 'admin' | 'user';
export type OrderStatus = 'pending' | 'paid' | 'failed';

export interface AuthResponse {
  token: string;
  name: string;
  email: string;
  role: Role;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Student {
  _id: string;
  name: string;
  email: string;
  role: 'user';
  phone: string | null;
  avatar: string | null;
  verified: boolean;
  enrolledCourses: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CurriculumSection {
  section: string;
  lessons: number;
}

export interface Course {
  _id: string;
  id: string;            // slug — use for routing & enrollment
  title: string;
  subtitle: string;
  instructor: string;
  duration: string;
  lessons: number;
  language: string;
  discount: number;      // percentage e.g. 51
  originalPrice: number;
  price: number;
  image: string;         // Supabase public URL or /public path
  category: string;
  rating: number;
  students: number;
  lastUpdated: string;
  description: string;
  whatYouLearn: string[];
  curriculum: CurriculumSection[];
  featured: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  _id: string;
  userId: string;
  courseId: string;
  amount: number;
  status: OrderStatus;
  paymentMethod: string;
  transactionId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Stats {
  _id: string;
  studentsEnrolled: string;
  videoTutorials: string;
  expertCourses: string;
  youtubeSubscribers: string;
}

export interface Testimonial {
  _id: string;
  name: string;
  role: string;
  text: string;
  rating: number;
  active: boolean;
}
```

---

## Common Mistakes to Avoid

| Mistake | Correct |
|---|---|
| Using `_id` for course routes | Use `id` slug e.g. `excel` |
| Using `id` slug for testimonial/user routes | Use `_id` from MongoDB |
| Setting `Content-Type: application/json` on file uploads | Let browser set it automatically |
| Calling `my-courses` before `confirm` resolves | Await `confirm` first, then fetch |
| Showing enroll button to already-enrolled student | Check `enrolledCourses` includes `course.id` |
| Requesting video URL once and caching it | Request fresh — expires in 1 hour |
| Sending all profile fields on PATCH | Send only changed fields |
