# Admin Panel — Frontend Guide

All admin routes require `role: admin` JWT.
Redirect to `/login` if token is missing or role is not `admin`.

```ts
// Run this check at the top of every admin page
const user = getAuthUser();
if (!user || user.role !== 'admin') router.push('/login');
```

---

## Pages & Routes

```
/admin/dashboard
/admin/courses
/admin/courses/new
/admin/courses/[id]/edit
/admin/testimonials
/admin/testimonials/new
/admin/testimonials/[id]/edit
/admin/users
/admin/users/[id]
/admin/orders
/admin/settings
```

---

## Layout

All admin pages share a sidebar layout:

**Sidebar links:**
- Dashboard → `/admin/dashboard`
- Courses → `/admin/courses`
- Testimonials → `/admin/testimonials`
- Users → `/admin/users`
- Orders → `/admin/orders`
- Settings → `/admin/settings`
- Logout → clear `sc_token` → redirect `/login`

---

## `/admin/dashboard`

Single API call returns everything needed.

```ts
const data = await apiFetch('/api/admin/dashboard');
```

**Response shape:**
```json
{
  "courses":      { "total": 4, "active": 3, "inactive": 1 },
  "students":     { "total": 120, "verified": 80, "unverified": 40 },
  "orders":       { "total": 95, "paid": 90, "pending": 5, "revenue": 152910 },
  "testimonials": { "total": 6, "active": 4, "inactive": 2 },
  "recentOrders":   [ ...last 5 paid orders ],
  "recentStudents": [ ...last 5 registered students ]
}
```

**UI — stat cards (top row):**

| Card | Value | Sub-info |
|---|---|---|
| Total Courses | `courses.total` | `active` active / `inactive` inactive |
| Total Students | `students.total` | `verified` verified |
| Total Revenue | `₹{orders.revenue}` | `orders.paid` paid orders |
| Testimonials | `testimonials.total` | `active` active |

**UI — tables (bottom):**
- Recent Orders table: courseId, amount, transactionId, createdAt
- Recent Students table: name, email, enrolledCourses count, createdAt

---

## `/admin/courses`

```ts
const courses = await apiFetch<Course[]>('/api/courses/all');
```

**Table columns:** Title, Category, Price, Students, Active, Actions

**Actions per row:**
- Toggle switch → `PATCH /api/courses/:id/toggle`
- Edit → `/admin/courses/[id]/edit`
- Delete → confirm dialog → `DELETE /api/courses/:id`

**Top bar:**
- "Add New Course" button → `/admin/courses/new`
- Search input (client-side filter by title)

---

## `/admin/courses/new`

```ts
// On submit
const course = await apiFetch<Course>('/api/courses', {
  method: 'POST',
  body: JSON.stringify(formData),
});
router.push('/admin/courses');
```

**Form fields:**

| Field | Input type | Required |
|---|---|---|
| `id` | text | Yes — unique slug e.g. `power-query` |
| `title` | text | Yes |
| `subtitle` | text | No |
| `instructor` | text | No |
| `price` | number | No |
| `originalPrice` | number | No |
| `discount` | number | No — percentage |
| `duration` | text | No — e.g. `13 Hours` |
| `lessons` | number | No |
| `language` | text | No — e.g. `Hinglish` |
| `category` | text | No |
| `rating` | number | No — 1–5 |
| `students` | number | No |
| `lastUpdated` | text | No — e.g. `January 2025` |
| `description` | textarea | No |
| `image` | upload | No — use `POST /api/upload/course-image` first, paste returned URL |
| `previewUrl` | text | No — YouTube embed URL |
| `whatYouLearn` | dynamic list | No — add/remove string items |
| `curriculum` | dynamic list | No — `{ section: string, lessons: number }` pairs |
| `featured` | checkbox | No |
| `active` | checkbox | No — default true |

**Image upload flow:**
```ts
// 1. User picks image file
// 2. Upload immediately on file select
const form = new FormData();
form.append('image', file);
const { data } = await fetch('/api/upload/course-image', { method: 'POST', headers: { Authorization }, body: form });
// 3. Set form field image = data.url
```

---

## `/admin/courses/[id]/edit`

```ts
// Load
const course = await apiFetch<Course>(`/api/courses/${id}`);

// Save
await apiFetch(`/api/courses/${id}`, {
  method: 'PUT',
  body: JSON.stringify(formData),
});
```

Same form as `/new` but pre-filled.

**Video section (separate from main form):**

```
[ Current video status ]
  - If videoPath is null  → "No video uploaded"
  - If videoPath exists   → show filename + "Remove" button

[ Upload new video ]
  Fields:
  - Video file (mp4/webm/quicktime, max 500MB)
  - Title (text)
  - Description (textarea)
  - Upload button → POST /api/upload/course-video (multipart)
  - Show progress bar during upload

[ Remove video ]
  - DELETE /api/upload/course-video/:courseId
```

**Video upload with progress:**
```ts
const xhr = new XMLHttpRequest();
xhr.upload.onprogress = (e) => setProgress(Math.round((e.loaded / e.total) * 100));
xhr.onload = () => {
  const res = JSON.parse(xhr.responseText);
  if (res.success) setCourse({ ...course, videoPath: res.data.videoPath });
};
xhr.open('POST', `${API}/api/upload/course-video`);
xhr.setRequestHeader('Authorization', `Bearer ${token}`);
const form = new FormData();
form.append('video', file);
form.append('courseId', course.id);
form.append('title', videoTitle);
form.append('description', videoDescription);
xhr.send(form);
```

---

## `/admin/testimonials`

```ts
const testimonials = await apiFetch<Testimonial[]>('/api/testimonials/all');
```

**Table columns:** Name, Role, Rating (stars), Active, Actions

**Actions per row:**
- Toggle → `PATCH /api/testimonials/:id/toggle`
- Edit → `/admin/testimonials/[id]/edit`
- Delete → confirm → `DELETE /api/testimonials/:id`

**Top bar:** "Add New" button → `/admin/testimonials/new`

---

## `/admin/testimonials/new`

```ts
await apiFetch('/api/testimonials', {
  method: 'POST',
  body: JSON.stringify({ name, role, text, rating, active: true }),
});
```

**Form fields:** Name, Role (e.g. `Data Analyst, Pune`), Text (textarea), Rating (1–5 star picker), Active (checkbox)

---

## `/admin/testimonials/[id]/edit`

```ts
// Pre-fill: find from already-fetched list or re-fetch /api/testimonials/all
await apiFetch(`/api/testimonials/${id}`, {
  method: 'PUT',
  body: JSON.stringify(formData),
});
```

---

## `/admin/users`

```ts
const students = await apiFetch<Student[]>('/api/users');
```

**Table columns:** Avatar, Name, Email, Enrolled (count), Verified badge, Joined date, Actions

**Actions per row:**
- Verify toggle → `PATCH /api/users/:id/verify`
- View → `/admin/users/[id]`
- Delete → confirm → `DELETE /api/users/:id`

**Top bar:** Search input (client-side filter by name or email)

---

## `/admin/users/[id]`

```ts
const student = await apiFetch<Student>(`/api/users/${id}`);
```

**UI sections:**

**Profile card:**
- Avatar (`student.avatar ?? '/default-avatar.png'`)
- Name, Email, Phone
- Verified badge + toggle button → `PATCH /api/users/:id/verify`
- Joined date

**Enrolled courses:**
```ts
// student.enrolledCourses = ['excel', 'sql']
// Fetch full course details for display
const courses = await apiFetch<Course[]>('/api/courses/all');
const enrolled = courses.filter(c => student.enrolledCourses.includes(c.id));
```
- List each course with title, image, unenroll button
- Unenroll → confirm → `PATCH /api/users/:id/unenroll` `{ courseId }`

**Order history:**
```ts
// No direct endpoint for a single user's orders — filter from all orders
const allOrders = await apiFetch<Order[]>('/api/payment/orders/all');
const userOrders = allOrders.filter(o => o.userId === student._id);
```

---

## `/admin/orders`

```ts
const orders = await apiFetch<Order[]>('/api/payment/orders/all');
```

**Table columns:** Transaction ID, Course ID, Amount (₹), Status badge, Payment Method, Date

**Status badge colors:**
- `paid` → green
- `pending` → yellow
- `failed` → red

**Top bar:** Filter by status (All / Paid / Pending / Failed) — client-side

---

## `/admin/settings`

Two sections:

**Platform Stats:**
```ts
// Load
const stats = await apiFetch<Stats>('/api/stats');

// Save
await apiFetch('/api/stats', {
  method: 'PUT',
  body: JSON.stringify({ studentsEnrolled, videoTutorials, expertCourses, youtubeSubscribers }),
});
```
Fields: studentsEnrolled, videoTutorials, expertCourses, youtubeSubscribers (all strings e.g. `"230,000+"`)

**Create Admin:**
```ts
await apiFetch('/api/auth/create-admin', {
  method: 'POST',
  body: JSON.stringify({ name, email, password }),
});
```
Fields: Name, Email, Password — show success/error message after submit

---

## API Summary (admin only endpoints)

| Method | Endpoint | Page |
|---|---|---|
| GET | `/api/admin/dashboard` | `/admin/dashboard` |
| GET | `/api/courses/all` | `/admin/courses` |
| POST | `/api/courses` | `/admin/courses/new` |
| PUT | `/api/courses/:id` | `/admin/courses/[id]/edit` |
| PATCH | `/api/courses/:id/toggle` | `/admin/courses` |
| DELETE | `/api/courses/:id` | `/admin/courses` |
| POST | `/api/upload/course-image` | `/admin/courses/new` + edit |
| POST | `/api/upload/course-video` | `/admin/courses/[id]/edit` |
| DELETE | `/api/upload/course-video/:courseId` | `/admin/courses/[id]/edit` |
| GET | `/api/testimonials/all` | `/admin/testimonials` |
| POST | `/api/testimonials` | `/admin/testimonials/new` |
| PUT | `/api/testimonials/:id` | `/admin/testimonials/[id]/edit` |
| PATCH | `/api/testimonials/:id/toggle` | `/admin/testimonials` |
| DELETE | `/api/testimonials/:id` | `/admin/testimonials` |
| GET | `/api/users` | `/admin/users` |
| GET | `/api/users/:id` | `/admin/users/[id]` |
| PATCH | `/api/users/:id/verify` | `/admin/users` + `[id]` |
| PATCH | `/api/users/:id/unenroll` | `/admin/users/[id]` |
| DELETE | `/api/users/:id` | `/admin/users` |
| GET | `/api/payment/orders/all` | `/admin/orders` |
| GET | `/api/stats` | `/admin/settings` |
| PUT | `/api/stats` | `/admin/settings` |
| POST | `/api/auth/create-admin` | `/admin/settings` |
