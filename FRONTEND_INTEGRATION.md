# Frontend Integration Guide — Skill Course API

## Overview

Standalone Express + TypeScript REST API.
All responses use a consistent envelope:

```json
{ "success": true, "data": { ... } }
{ "success": false, "error": "message" }
```

CORS is open for all origins. All endpoints return JSON.

---

## Base URL

```
Development:  http://localhost:5000
Production:   https://<your-deployed-domain>
```

Add to your frontend env:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

---

## Auth Flow Overview

```
Public user  →  no token required
Student      →  register/login → JWT → send as Bearer token
Admin        →  login (role: admin) → JWT → send as Bearer token
```

Token is valid for **7 days**. Store in `localStorage` or a cookie.

---

## Base Fetch Helper

Create one helper that handles auth headers and error unwrapping:

```ts
const API = process.env.NEXT_PUBLIC_API_URL;

function getToken(): string | null {
  return localStorage.getItem('sc_token');
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data as T;
}
```

---

## TypeScript Types

Copy into your frontend `types.ts`:

```ts
export type Role = 'admin' | 'user';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface AuthResponse {
  token: string;
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
  avatar: string | null;  // URL or relative path e.g. /avatars/user.webp
  verified: boolean;
  enrolledCourses: string[]; // course id slugs e.g. ['excel', 'sql']
  createdAt: string;
  updatedAt: string;
}

export interface CurriculumSection {
  section: string;
  lessons: number;
}

export interface Course {
  _id: string;
  id: string;            // slug — use for routing: /course/excel
  title: string;
  subtitle: string;
  instructor: string;
  duration: string;
  lessons: number;
  language: string;
  discount: number;      // percentage e.g. 51
  originalPrice: number;
  price: number;
  image: string;         // e.g. /excel.webp — must exist in frontend /public
  category: string;
  enrollUrl: string;     // external link — open in new tab
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

export interface Stats {
  _id: string;
  studentsEnrolled: string;    // "230,000+"
  videoTutorials: string;      // "1,300+"
  expertCourses: string;       // "21+"
  youtubeSubscribers: string;  // "2M+"
}

export interface Testimonial {
  _id: string;
  name: string;
  role: string;   // e.g. "Data Analyst, Pune"
  text: string;
  rating: number; // 1–5
  active: boolean;
}
```

---

## Auth State Helper

Decode the stored token without an extra API call:

```ts
import { jwtDecode } from 'jwt-decode'; // npm i jwt-decode

export function getAuthUser(): AuthUser | null {
  const token = localStorage.getItem('sc_token');
  if (!token) return null;
  try {
    return jwtDecode<AuthUser>(token);
  } catch {
    return null;
  }
}

export function isAdmin(): boolean {
  return getAuthUser()?.role === 'admin';
}

export function isStudent(): boolean {
  return getAuthUser()?.role === 'user';
}

export function logout(): void {
  localStorage.removeItem('sc_token');
}
```

---

## Endpoints

### Auth — `/api/auth`

---

#### POST `/api/auth/register`
Register a new student account. Always creates `role: user`.

```ts
const data = await apiFetch<AuthResponse>('/api/auth/register', {
  method: 'POST',
  body: JSON.stringify({ name: 'Rahul', email: 'rahul@example.com', password: 'pass123' }),
});
localStorage.setItem('sc_token', data.token);
// data.role === 'user'
```

**Use on:** `/register` page

---

#### POST `/api/auth/login`
Login for both students and admins. Role is returned in response and embedded in token.

```ts
const data = await apiFetch<AuthResponse>('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email: 'admin@skillcourse.in', password: 'pass' }),
});
localStorage.setItem('sc_token', data.token);

if (data.role === 'admin') {
  router.push('/admin/dashboard');
} else {
  router.push('/dashboard');
}
```

**Use on:** `/login` page — redirect based on `role` after login

---

#### GET `/api/auth/me`
Returns the decoded token payload of the currently logged-in user.

```ts
const user = await apiFetch<AuthUser>('/api/auth/me');
// { id, name, email, role }
```

**Use on:** Any page that needs to verify session server-side

---

#### POST `/api/auth/enroll`
Student enrolls in a course. Requires student JWT.

```ts
await apiFetch('/api/auth/enroll', {
  method: 'POST',
  body: JSON.stringify({ courseId: 'excel' }), // id slug, not _id
});
```

**Errors:**
- `404` — course not found or inactive
- `400` — already enrolled

**Use on:** Course detail page `/course/[id]` — show enroll button only if student is logged in and not already enrolled

---

#### GET `/api/auth/my-courses`
Returns full course objects for all courses the student is enrolled in. Requires student JWT.

```ts
const courses = await apiFetch<Course[]>('/api/auth/my-courses');
```

**Use on:** `/dashboard` — student's enrolled courses list

---

#### PATCH `/api/auth/profile`
Student updates their own name, phone, or avatar. Requires student JWT. Only provided fields are updated.

```ts
await apiFetch('/api/auth/profile', {
  method: 'PATCH',
  body: JSON.stringify({ phone: '+91 98765 43210', avatar: '/avatars/rahul.webp' }),
});
```

**Updatable fields:** `name`, `phone`, `avatar`

**Use on:** `/dashboard/profile` or `/dashboard/settings`

---

#### POST `/api/auth/create-admin`
Create a new admin account. Requires admin JWT.

```ts
await apiFetch('/api/auth/create-admin', {
  method: 'POST',
  body: JSON.stringify({ name: 'New Admin', email: 'admin2@skillcourse.in', password: 'securepass' }),
});
```

**Use on:** `/admin/settings` — admin management section

---

### Courses — `/api/courses`

---

#### GET `/api/courses`
All active courses. Public.

```ts
const courses = await apiFetch<Course[]>('/api/courses');
const featured = courses.filter(c => c.featured); // for homepage
```

**Use on:** Homepage, `/mastery-courses`

---

#### GET `/api/courses/all`
All courses including inactive. Admin only.

```ts
const courses = await apiFetch<Course[]>('/api/courses/all');
```

**Use on:** `/admin/courses`

---

#### GET `/api/courses/:id`
Single active course by slug. Public.

```ts
const course = await apiFetch<Course>(`/api/courses/excel`);
```

**Use on:** `/course/[id]`

---

#### POST `/api/courses`
Create a new course. Admin only.

```ts
await apiFetch<Course>('/api/courses', {
  method: 'POST',
  body: JSON.stringify({ id: 'power-query', title: 'Power Query Mastery', price: 1499, ... }),
});
```

**Required fields:** `id` (unique slug), `title`

**Use on:** `/admin/courses/new`

---

#### PUT `/api/courses/:id`
Update a course by slug. Admin only.

```ts
await apiFetch<Course>('/api/courses/excel', {
  method: 'PUT',
  body: JSON.stringify({ price: 1499, discount: 55 }),
});
```

**Use on:** `/admin/courses/[id]/edit`

---

#### PATCH `/api/courses/:id/toggle`
Toggle a course's `active` status. Admin only.

```ts
const result = await apiFetch<{ id: string; active: boolean }>('/api/courses/excel/toggle', {
  method: 'PATCH',
});
// result.active = new status
```

**Use on:** `/admin/courses` — active/inactive toggle switch per row

---

#### DELETE `/api/courses/:id`
Permanently delete a course. Admin only.

```ts
await apiFetch('/api/courses/excel', { method: 'DELETE' });
```

**Use on:** `/admin/courses` — delete button per row

---

### Stats — `/api/stats`

---

#### GET `/api/stats`
Platform statistics. Public.

```ts
const stats = await apiFetch<Stats>('/api/stats');
```

**Use on:** Homepage stats bar, `/about-skill-course`

---

#### PUT `/api/stats`
Update platform stats. Admin only.

```ts
await apiFetch('/api/stats', {
  method: 'PUT',
  body: JSON.stringify({ studentsEnrolled: '250,000+', youtubeSubscribers: '2.5M+' }),
});
```

**Use on:** `/admin/settings`

---

### Testimonials — `/api/testimonials`

---

#### GET `/api/testimonials`
All active testimonials. Public.

```ts
const testimonials = await apiFetch<Testimonial[]>('/api/testimonials');
```

**Use on:** Homepage, `/our-learners`

---

#### GET `/api/testimonials/all`
All testimonials including inactive. Admin only.

```ts
const testimonials = await apiFetch<Testimonial[]>('/api/testimonials/all');
```

**Use on:** `/admin/testimonials`

---

#### POST `/api/testimonials`
Add a new testimonial. Admin only.

```ts
await apiFetch('/api/testimonials', {
  method: 'POST',
  body: JSON.stringify({ name: 'Ravi Kumar', role: 'Analyst, Delhi', text: '...', rating: 5 }),
});
```

**Use on:** `/admin/testimonials/new`

---

#### PUT `/api/testimonials/:id`
Update a testimonial by MongoDB `_id`. Admin only.

```ts
await apiFetch(`/api/testimonials/${id}`, {
  method: 'PUT',
  body: JSON.stringify({ text: 'Updated text', rating: 4 }),
});
```

**Use on:** `/admin/testimonials/[id]/edit`

---

#### PATCH `/api/testimonials/:id/toggle`
Toggle a testimonial's `active` status. Admin only.

```ts
const result = await apiFetch<{ _id: string; active: boolean }>(`/api/testimonials/${id}/toggle`, {
  method: 'PATCH',
});
```

**Use on:** `/admin/testimonials` — show/hide toggle per row

---

#### DELETE `/api/testimonials/:id`
Delete a testimonial. Admin only.

```ts
await apiFetch(`/api/testimonials/${id}`, { method: 'DELETE' });
```

**Use on:** `/admin/testimonials` — delete button per row

---

### Users — `/api/users`

All user endpoints require admin JWT.

---

#### GET `/api/users`
List all students (no passwords returned).

```ts
const students = await apiFetch<Student[]>('/api/users');
```

**Use on:** `/admin/users`

---

#### GET `/api/users/:id`
Get a single student with their enrolled courses.

```ts
const student = await apiFetch<Student>(`/api/users/${id}`);
// student.enrolledCourses = ['excel', 'sql']
// student.phone, student.avatar, student.verified
```

**Use on:** `/admin/users/[id]`

---

#### PATCH `/api/users/:id/verify`
Toggle a student's `verified` status.

```ts
const result = await apiFetch<{ _id: string; verified: boolean }>(`/api/users/${id}/verify`, {
  method: 'PATCH',
});
// result.verified = new status
```

**Use on:** `/admin/users/[id]` or `/admin/users` — verified badge toggle

---

#### PATCH `/api/users/:id/unenroll`
Remove a course from a student's enrolled list.

```ts
await apiFetch(`/api/users/${id}/unenroll`, {
  method: 'PATCH',
  body: JSON.stringify({ courseId: 'excel' }),
});
```

**Use on:** `/admin/users/[id]` — unenroll button per course

---

#### DELETE `/api/users/:id`
Delete a student account permanently.

```ts
await apiFetch(`/api/users/${id}`, { method: 'DELETE' });
```

**Use on:** `/admin/users` — delete button per row

---

## HTTP Status Codes

| Code | Meaning |
|---|---|
| `200` | OK |
| `201` | Created |
| `400` | Bad request / validation error |
| `401` | No token or invalid token |
| `403` | Valid token but insufficient role |
| `404` | Resource not found |
| `500` | Server error |

---

## Page-by-Page Integration Map

### Public Pages

| Page | Endpoints |
|---|---|
| `/` | `GET /api/courses` (filter `featured: true`) + `GET /api/stats` + `GET /api/testimonials` |
| `/mastery-courses` | `GET /api/courses` |
| `/course/[id]` | `GET /api/courses/:id` — show Enroll button if student is logged in |
| `/about-skill-course` | `GET /api/stats` |
| `/our-learners` | `GET /api/testimonials` |

### Auth Pages

| Page | Endpoints |
|---|---|
| `/login` | `POST /api/auth/login` — redirect to `/admin/dashboard` if admin, `/dashboard` if student |
| `/register` | `POST /api/auth/register` — redirect to `/dashboard` after success |

### Student Pages (require `role: user` JWT)

| Page | Endpoints |
|---|---|
| `/dashboard` | `GET /api/auth/my-courses` |
| `/course/[id]` | `POST /api/auth/enroll` — enroll button |

### Admin Pages (require `role: admin` JWT)

| Page | Endpoints |
|---|---|
| `/admin/dashboard` | `GET /api/courses/all` + `GET /api/users` + `GET /api/stats` |
| `/admin/courses` | `GET /api/courses/all` + `PATCH .../toggle` + `DELETE ...` |
| `/admin/courses/new` | `POST /api/courses` |
| `/admin/courses/[id]/edit` | `GET /api/courses/:id` + `PUT /api/courses/:id` |
| `/admin/testimonials` | `GET /api/testimonials/all` + `PATCH .../toggle` + `DELETE ...` |
| `/admin/testimonials/new` | `POST /api/testimonials` |
| `/admin/testimonials/[id]/edit` | `PUT /api/testimonials/:id` |
| `/admin/users` | `GET /api/users` + `DELETE /api/users/:id` |
| `/admin/users/[id]` | `GET /api/users/:id` + `PATCH .../unenroll` |
| `/admin/settings` | `PUT /api/stats` + `POST /api/auth/create-admin` |

---

## Route Guard Logic

### Protect student pages

```ts
// Run on every student-only page before render
const user = getAuthUser();
if (!user) router.push('/login?redirect=/dashboard');
if (user.role !== 'user') router.push('/');
```

### Protect admin pages

```ts
// Run on every admin page before render
const user = getAuthUser();
if (!user) router.push('/login?redirect=/admin/dashboard');
if (user.role !== 'admin') router.push('/');
```

### Redirect after login

```ts
// In /login page after successful login
const redirect = searchParams.get('redirect') ?? (data.role === 'admin' ? '/admin/dashboard' : '/dashboard');
router.push(redirect);
```

---

## Important Notes

- Use `id` (slug like `"excel"`) for course routing and enrollment — not MongoDB's `_id`
- Use `_id` for testimonial update/delete operations
- `image` paths like `/excel.webp` must exist in your frontend `/public` folder
- `enrollUrl` is an external payment/enrollment link — always open with `target="_blank" rel="noopener noreferrer"`
- `discount` is a number (e.g. `51` = 51% off) — compute display price as `originalPrice * (1 - discount/100)`
- Stats values are pre-formatted strings — render directly, no formatting needed
- Passwords are never returned by any endpoint (`select('-password')` is applied)
