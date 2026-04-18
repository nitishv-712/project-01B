# RBAC Pages Guide — Skill Course Frontend

This document lists every page that needs to be built to support the auth and RBAC system.
Each entry includes the route, who can access it, what API calls it makes, and exactly what UI it needs.

---

## Auth Pages

---

### `/register`

**Access:** Public (redirect to `/dashboard` if already logged in)

**API:**
```ts
POST /api/auth/register
body: { name, email, password }
→ save token to localStorage
→ redirect to /dashboard
```

**UI:**
- Form: Name, Email, Password, Confirm Password
- Submit button
- Link to `/login`
- Show error message on failure (e.g. "Email already registered")

---

### `/login`

**Access:** Public (redirect away if already logged in)

**API:**
```ts
POST /api/auth/login
body: { email, password }
→ save token to localStorage
→ if role === 'admin' → redirect to /admin/dashboard
→ if role === 'user'  → redirect to /dashboard (or ?redirect= param)
```

**UI:**
- Form: Email, Password
- Submit button
- Link to `/register`
- Show error on invalid credentials

---

## Student Pages

All student pages must check: token exists + `role === 'user'`. Redirect to `/login?redirect=<current-path>` if not.

---

### `/dashboard`

**Access:** Student only

**API:**
```ts
GET /api/auth/my-courses
→ list of full Course objects the student is enrolled in
```

**UI:**
- Welcome message with student name (from decoded token)
- Grid of enrolled course cards — title, image, instructor, duration
- Each card links to `/course/[id]`
- Empty state: "You haven't enrolled in any courses yet" + link to `/mastery-courses`

---

### `/course/[id]` *(extended from public page)*

**Access:** Public to view. Enroll button requires student JWT.

**API:**
```ts
GET /api/courses/:id          → course details (always)
POST /api/auth/enroll         → { courseId: id } (on enroll button click)
GET /api/auth/my-courses      → check if already enrolled (to show correct button state)
```

**UI additions for logged-in student:**
- If not enrolled: "Enroll Now" button → calls `POST /api/auth/enroll`
- If already enrolled: "Go to Course" button (disabled enroll, show enrolled badge)
- If not logged in: "Login to Enroll" button → redirect to `/login?redirect=/course/[id]`

---

## Admin Pages

All admin pages must check: token exists + `role === 'admin'`. Redirect to `/login` if not.

---

### `/admin/dashboard`

**Access:** Admin only

**API:**
```ts
GET /api/courses/all   → total courses count, active vs inactive
GET /api/users         → total students count
GET /api/stats         → platform stats
```

**UI:**
- Stats cards: Total Courses, Active Courses, Total Students, Platform Stats
- Quick links to `/admin/courses`, `/admin/users`, `/admin/testimonials`, `/admin/settings`

---

### `/admin/courses`

**Access:** Admin only

**API:**
```ts
GET /api/courses/all                    → all courses including inactive
PATCH /api/courses/:id/toggle           → toggle active/inactive
DELETE /api/courses/:id                 → delete course
```

**UI:**
- Table/grid: title, category, price, students, active status, actions
- Active toggle switch per row → calls `PATCH .../toggle`
- Edit button per row → links to `/admin/courses/[id]/edit`
- Delete button per row → confirm dialog → calls `DELETE`
- "Add New Course" button → links to `/admin/courses/new`

---

### `/admin/courses/new`

**Access:** Admin only

**API:**
```ts
POST /api/courses
body: full course object
→ redirect to /admin/courses on success
```

**UI:**
Form fields:
- `id` — slug (e.g. `power-query`) — must be unique
- `title`, `subtitle`, `instructor`
- `price`, `originalPrice`, `discount`
- `duration`, `lessons`, `language`
- `category`, `image` (path string), `enrollUrl`
- `rating`, `students`, `lastUpdated`
- `description` — textarea
- `whatYouLearn` — dynamic list (add/remove items)
- `curriculum` — dynamic list of `{ section, lessons }` pairs
- `featured` — checkbox
- `active` — checkbox (default true)
- Submit + Cancel buttons

---

### `/admin/courses/[id]/edit`

**Access:** Admin only

**API:**
```ts
GET /api/courses/:id     → pre-fill form
PUT /api/courses/:id     → save changes
→ redirect to /admin/courses on success
```

**UI:** Same form as `/admin/courses/new` but pre-filled with existing data.

---

### `/admin/testimonials`

**Access:** Admin only

**API:**
```ts
GET /api/testimonials/all               → all testimonials including inactive
PATCH /api/testimonials/:id/toggle      → toggle active/inactive
DELETE /api/testimonials/:id            → delete
```

**UI:**
- Table: name, role, rating, active status, actions
- Active toggle per row
- Edit button → `/admin/testimonials/[id]/edit`
- Delete button → confirm dialog
- "Add New" button → `/admin/testimonials/new`

---

### `/admin/testimonials/new`

**Access:** Admin only

**API:**
```ts
POST /api/testimonials
body: { name, role, text, rating, active }
→ redirect to /admin/testimonials on success
```

**UI:**
- Form: Name, Role (e.g. "Data Analyst, Pune"), Text (textarea), Rating (1–5), Active checkbox
- Submit + Cancel

---

### `/admin/testimonials/[id]/edit`

**Access:** Admin only

**API:**
```ts
GET /api/testimonials/all   → find by _id to pre-fill (or store in state from list page)
PUT /api/testimonials/:id   → save changes
```

**UI:** Same form as new, pre-filled.

> Note: Use MongoDB `_id` for testimonial update/delete, not a slug.

---

### `/admin/users`

**Access:** Admin only

**API:**
```ts
GET /api/users              → all students
DELETE /api/users/:id       → delete student
```

**UI:**
- Table: name, email, enrolled courses count, joined date, actions
- View button → `/admin/users/[id]`
- Delete button → confirm dialog → `DELETE /api/users/:id`
- Search/filter by name or email (client-side)

---

### `/admin/users/[id]`

**Access:** Admin only

**API:**
```ts
GET /api/users/:id                      → student details + enrolledCourses array
PATCH /api/users/:id/unenroll           → { courseId } → remove a course
```

**UI:**
- Student info: name, email, joined date
- Enrolled courses list: course title, slug, unenroll button per course
- Unenroll button → confirm → `PATCH .../unenroll` with `{ courseId }`
- Back to `/admin/users`

---

### `/admin/settings`

**Access:** Admin only

**API:**
```ts
GET /api/stats              → pre-fill stats form
PUT /api/stats              → update stats
POST /api/auth/create-admin → create new admin account
```

**UI — two sections:**

**Platform Stats:**
- Form: studentsEnrolled, videoTutorials, expertCourses, youtubeSubscribers (all strings)
- Save button

**Create Admin:**
- Form: Name, Email, Password
- Submit button
- Show success/error message

---

## Route Guard Summary

| Route pattern | Required role | Redirect if not |
|---|---|---|
| `/dashboard` | `user` | `/login?redirect=/dashboard` |
| `/course/[id]` enroll action | `user` | `/login?redirect=/course/[id]` |
| `/admin/*` | `admin` | `/login` |
| `/login`, `/register` | none (public) | `/dashboard` or `/admin/dashboard` if already logged in |

---

## Suggested Navigation Structure

### Header (public)
- Logo → `/`
- Courses → `/mastery-courses`
- Login → `/login`
- Register → `/register`
- If student logged in: "My Dashboard" → `/dashboard` + Logout
- If admin logged in: "Admin Panel" → `/admin/dashboard` + Logout

### Admin Sidebar
- Dashboard → `/admin/dashboard`
- Courses → `/admin/courses`
- Testimonials → `/admin/testimonials`
- Users → `/admin/users`
- Settings → `/admin/settings`
- Logout

---

## Token Storage Convention

```ts
// Save on login/register
localStorage.setItem('sc_token', data.token);

// Read on every protected page
const token = localStorage.getItem('sc_token');

// Clear on logout
localStorage.removeItem('sc_token');
```

Decode without an API call using `jwt-decode`:

```ts
import { jwtDecode } from 'jwt-decode';

const user = jwtDecode<{ id: string; name: string; email: string; role: 'admin' | 'user' }>(token);
```
