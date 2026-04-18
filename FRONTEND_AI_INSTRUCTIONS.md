# Frontend AI Instructions — Skill Course

You are building the frontend for an e-learning platform called **Skill Course**.
The backend is already built and running. Your job is to connect to it and build every page.

Read this entire file before writing a single line of code.

---

## Tech Stack to Use

- Next.js 15+ with App Router
- TypeScript
- Tailwind CSS
- `jwt-decode` for reading JWT tokens client-side (`npm i jwt-decode`)

---

## Backend URL

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

Put this in `.env.local`. Every API call goes to this base URL.

---

## Design System

Follow this exactly across all pages:

- Primary color: orange — use `orange-500` (`#f97316`) for buttons, highlights, badges
- Dark: `gray-900` for headings
- Body text: `gray-700`
- Background: `gray-50` or `white`
- Cards: `rounded-xl shadow-md hover:shadow-2xl transition`
- Buttons: `rounded-lg px-4 py-2 font-semibold transition`
- Primary button: `bg-orange-500 hover:bg-orange-600 text-white`
- Danger button: `bg-red-500 hover:bg-red-600 text-white`
- Ghost button: `border border-gray-300 hover:bg-gray-100 text-gray-700`
- Inputs: `border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400`
- Font: system font via `next/font/local` (Geist)

---

## Copy These Exactly — Types

Create `lib/types.ts` with:

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
  enrollUrl: string;
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

## Copy These Exactly — Utilities

Create `lib/auth.ts`:

```ts
import { jwtDecode } from 'jwt-decode';
import { AuthUser } from './types';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('sc_token');
}

export function getAuthUser(): AuthUser | null {
  const token = getToken();
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

export function saveToken(token: string): void {
  localStorage.setItem('sc_token', token);
}

export function logout(): void {
  localStorage.removeItem('sc_token');
}
```

Create `lib/api.ts`:

```ts
const API = process.env.NEXT_PUBLIC_API_URL;

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('sc_token') : null;
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

## Route Guard Rules

Apply these checks at the top of every protected page before rendering anything:

**Student pages** — redirect if not logged in or not a student:
```ts
const user = getAuthUser();
if (!user) router.push('/login?redirect=<current-path>');
if (user.role !== 'user') router.push('/');
```

**Admin pages** — redirect if not logged in or not an admin:
```ts
const user = getAuthUser();
if (!user) router.push('/login');
if (user.role !== 'admin') router.push('/');
```

**Auth pages** (`/login`, `/register`) — redirect away if already logged in:
```ts
const user = getAuthUser();
if (user?.role === 'admin') router.push('/admin/dashboard');
if (user?.role === 'user') router.push('/dashboard');
```

---

## Header Behavior

The header must change based on auth state. Check `getAuthUser()` on mount:

- Not logged in: show Login + Register buttons
- Student logged in: show "My Dashboard" link + avatar/name + Logout button
- Admin logged in: show "Admin Panel" link + Logout button

On logout: call `logout()` then `router.push('/')`.

---

## Pages to Build

---

### PUBLIC PAGES

---

#### `/` — Homepage

Fetch on server or client:
- `GET /api/courses` → filter `featured === true` → show as course cards
- `GET /api/stats` → show stats bar
- `GET /api/testimonials` → show testimonials section

Sections in order:
1. Hero — headline, subheadline, CTA button → `/mastery-courses`
2. Stats bar — 4 numbers from stats API (render values directly, they are pre-formatted strings)
3. Featured courses grid — cards with image, title, instructor, price, originalPrice, discount badge, rating
4. Testimonials carousel or grid — name, role, text, star rating
5. Footer

Course card must show:
- `course.image` as `<Image>` (from `/public`)
- Discount badge: `{course.discount}% OFF`
- Strikethrough original price + current price
- Rating stars + student count
- "View Course" button → `/course/{course.id}`

---

#### `/mastery-courses` — All Courses

- `GET /api/courses` → show all active courses in a grid
- Same course card as homepage
- Add category filter buttons (client-side filter by `course.category`)

---

#### `/course/[id]` — Course Detail

- `GET /api/courses/{id}` → full course details

Sections:
1. Course header — title, subtitle, instructor, rating, students, lastUpdated, language
2. What you'll learn — `whatYouLearn` array as checklist
3. Curriculum — `curriculum` array, each item shows section name + lesson count
4. Pricing card — originalPrice crossed out, price, discount badge, enroll button

Enroll button logic (check on mount with `getAuthUser()`):
- Not logged in → button says "Login to Enroll" → `router.push('/login?redirect=/course/{id}')`
- Student, not enrolled → button says "Enroll Now" → `POST /api/auth/enroll` with `{ courseId: course.id }`
  - To check enrollment: `GET /api/auth/my-courses` → check if `course.id` is in results
- Student, already enrolled → button says "Already Enrolled" (disabled, green)
- Admin → hide enroll button entirely

---

#### `/about-skill-course` — About Page

- `GET /api/stats` → show platform milestones
- Static content: founder info, mission, team

---

#### `/our-learners` — Testimonials Page

- `GET /api/testimonials` → show all active testimonials
- Grid of testimonial cards: avatar placeholder, name, role, text, star rating

---

#### `/contact` — Contact Page

- Static page, contact form (no backend endpoint, can be a mailto or just UI)
- Show: email, phone, address fields in the form

---

#### `/blogs` — Blog Listing

- Static page for now, hardcode 3–4 blog cards
- Each card: title, category tag, date, short description, "Read More" link

---

### AUTH PAGES

---

#### `/register` — Register

API: `POST /api/auth/register` with `{ name, email, password }`

On success:
```ts
saveToken(data.token);
router.push('/dashboard');
```

Form fields: Name, Email, Password, Confirm Password
- Validate passwords match before submitting
- Show inline error if API returns error (e.g. "Email already registered")
- Link at bottom: "Already have an account? Login"

---

#### `/login` — Login

API: `POST /api/auth/login` with `{ email, password }`

On success:
```ts
saveToken(data.token);
const redirect = searchParams.get('redirect');
if (data.role === 'admin') router.push(redirect ?? '/admin/dashboard');
else router.push(redirect ?? '/dashboard');
```

Form fields: Email, Password
- Show inline error on wrong credentials
- Link at bottom: "Don't have an account? Register"

---

### STUDENT PAGES

All require: token exists + `role === 'user'`

---

#### `/dashboard` — Student Dashboard

API: `GET /api/auth/my-courses`

Layout:
- Sidebar or top nav: Dashboard, My Courses, Profile, Logout
- Welcome message: "Welcome back, {user.name}"
- Enrolled courses grid — same course card style
- Empty state if no courses: "You haven't enrolled yet" + "Browse Courses" button → `/mastery-courses`

---

#### `/dashboard/profile` — Student Profile

API:
- On mount: `GET /api/auth/me` to get current user info
- On save: `PATCH /api/auth/profile` with `{ name, phone, avatar }`

Form fields:
- Avatar — show current avatar image if set, else a placeholder circle with initials
  - Input: URL string field for avatar (or file upload if you want, but URL is fine)
- Name — text input, pre-filled
- Email — read-only (cannot be changed)
- Phone — text input, pre-filled if set
- Verified badge — show a green "Verified" or gray "Not Verified" badge (read-only, set by admin)
- Save button

---

### ADMIN PAGES

All require: token exists + `role === 'admin'`

Use a shared admin layout with a sidebar for all `/admin/*` pages.

Admin sidebar links:
- Dashboard → `/admin/dashboard`
- Courses → `/admin/courses`
- Testimonials → `/admin/testimonials`
- Users → `/admin/users`
- Settings → `/admin/settings`
- Logout

---

#### `/admin/dashboard` — Admin Overview

APIs:
- `GET /api/courses/all` → count total, count active
- `GET /api/users` → count total students
- `GET /api/stats` → show platform stats

UI:
- 4 stat cards: Total Courses, Active Courses, Total Students, YouTube Subscribers
- Quick action buttons to each section

---

#### `/admin/courses` — Manage Courses

APIs:
- `GET /api/courses/all` → list all courses including inactive
- `PATCH /api/courses/{id}/toggle` → toggle active (use course `id` slug)
- `DELETE /api/courses/{id}` → delete (use course `id` slug, show confirm dialog first)

Table columns: Thumbnail, Title, Category, Price, Students, Active (toggle), Actions (Edit, Delete)

- Active toggle: a switch component, on change call `PATCH .../toggle`, update UI optimistically
- Edit button → navigate to `/admin/courses/{id}/edit`
- Delete button → show confirm modal → on confirm call `DELETE`
- "Add New Course" button top-right → `/admin/courses/new`

---

#### `/admin/courses/new` — Add Course

API: `POST /api/courses`

On success → redirect to `/admin/courses`

Form fields (all from the Course type):
- `id` — slug input (e.g. `power-query`), required, unique
- `title` — required
- `subtitle`
- `instructor`
- `price`, `originalPrice`, `discount` — number inputs
- `duration` (e.g. "13 Hours"), `lessons` (number), `language`
- `category`
- `image` — string input for path (e.g. `/excel.webp`)
- `enrollUrl` — URL input
- `rating` — number 1–5
- `students` — number
- `lastUpdated` — text (e.g. "December 2024")
- `description` — textarea
- `whatYouLearn` — dynamic list: text inputs with Add/Remove buttons
- `curriculum` — dynamic list of `{ section: string, lessons: number }` with Add/Remove buttons
- `featured` — checkbox
- `active` — checkbox (default checked)

---

#### `/admin/courses/[id]/edit` — Edit Course

APIs:
- On mount: `GET /api/courses/{id}` → pre-fill all form fields
- On submit: `PUT /api/courses/{id}`

Same form as `/admin/courses/new` but pre-filled. Use course `id` slug from URL param.

---

#### `/admin/testimonials` — Manage Testimonials

APIs:
- `GET /api/testimonials/all`
- `PATCH /api/testimonials/{_id}/toggle`
- `DELETE /api/testimonials/{_id}`

Table columns: Name, Role, Rating (stars), Active (toggle), Actions (Edit, Delete)

Note: use MongoDB `_id` for testimonial operations, not a slug.

- "Add New" button → `/admin/testimonials/new`
- Edit button → `/admin/testimonials/{_id}/edit`

---

#### `/admin/testimonials/new` — Add Testimonial

API: `POST /api/testimonials`
Body: `{ name, role, text, rating, active }`

Form: Name, Role (e.g. "Data Analyst, Pune"), Text (textarea), Rating (1–5 star picker or number), Active checkbox

On success → redirect to `/admin/testimonials`

---

#### `/admin/testimonials/[id]/edit` — Edit Testimonial

APIs:
- On mount: fetch from the list (pass via router state) or re-fetch `GET /api/testimonials/all` and find by `_id`
- On submit: `PUT /api/testimonials/{_id}`

Same form as new, pre-filled.

---

#### `/admin/users` — Manage Students

APIs:
- `GET /api/users` → list all students
- `PATCH /api/users/{_id}/verify` → toggle verified
- `DELETE /api/users/{_id}` → delete student

Table columns:
- Avatar (show image if set, else initials circle)
- Name
- Email
- Phone (show "—" if null)
- Enrolled Courses count
- Verified (toggle switch — calls `PATCH .../verify`)
- Joined date (`createdAt` formatted)
- Actions: View, Delete

- View button → `/admin/users/{_id}`
- Delete → confirm modal → `DELETE`
- Client-side search bar to filter by name or email

---

#### `/admin/users/[id]` — Student Detail

APIs:
- `GET /api/users/{_id}` → student full profile
- `PATCH /api/users/{_id}/unenroll` with `{ courseId }` → remove a course

UI:
- Profile card: avatar (or initials), name, email, phone, verified badge, joined date
- Enrolled courses list — each row: course title, course id slug, "Unenroll" button
  - Unenroll → confirm → `PATCH .../unenroll` with `{ courseId: course.id }`
- Back button → `/admin/users`

---

#### `/admin/settings` — Settings

APIs:
- On mount: `GET /api/stats` → pre-fill stats form
- Stats save: `PUT /api/stats`
- Create admin: `POST /api/auth/create-admin`

Two separate sections on the same page:

**Section 1 — Platform Stats:**
Form fields: studentsEnrolled, videoTutorials, expertCourses, youtubeSubscribers (all text inputs)
Save button — on success show green toast/message

**Section 2 — Create Admin Account:**
Form fields: Name, Email, Password
Submit button — on success show "Admin created successfully", clear form
On error show the error message inline

---

## Important Rules

1. Use `course.id` (the slug like `"excel"`) for all course API calls and routing — never `course._id`
2. Use `testimonial._id` (MongoDB ObjectId) for testimonial update/delete calls
3. Use `user._id` (MongoDB ObjectId) for all user admin operations
4. `course.image` is a path like `/excel.webp` — it must exist in your `/public` folder. Use Next.js `<Image>` component with `width` and `height`
5. `course.enrollUrl` is an external link — always render as `<a href={enrollUrl} target="_blank" rel="noopener noreferrer">`
6. `course.discount` is a number (e.g. `51`) meaning 51% off — display as a badge
7. Stats values (`studentsEnrolled`, etc.) are already formatted strings like `"230,000+"` — render them directly, do not reformat
8. Passwords are never returned by the API — never try to display or prefill a password field from API data
9. The `verified` field on a student is set only by admin via `PATCH /api/users/{id}/verify` — students cannot set it themselves
10. Avatar is a URL string or null — if null, show a fallback: a circle with the user's initials in orange

---

## Folder Structure to Follow

```
app/
├── (public)/
│   ├── page.tsx                        # /
│   ├── mastery-courses/page.tsx
│   ├── course/[id]/page.tsx
│   ├── about-skill-course/page.tsx
│   ├── our-learners/page.tsx
│   ├── contact/page.tsx
│   └── blogs/page.tsx
├── (auth)/
│   ├── login/page.tsx
│   └── register/page.tsx
├── dashboard/
│   ├── page.tsx                        # /dashboard
│   └── profile/page.tsx
├── admin/
│   ├── layout.tsx                      # shared admin sidebar layout
│   ├── dashboard/page.tsx
│   ├── courses/
│   │   ├── page.tsx
│   │   ├── new/page.tsx
│   │   └── [id]/edit/page.tsx
│   ├── testimonials/
│   │   ├── page.tsx
│   │   ├── new/page.tsx
│   │   └── [id]/edit/page.tsx
│   ├── users/
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   └── settings/page.tsx
├── components/
│   ├── Header.tsx
│   ├── Footer.tsx
│   ├── CourseCard.tsx
│   ├── AdminSidebar.tsx
│   └── StarRating.tsx
├── lib/
│   ├── api.ts
│   ├── auth.ts
│   └── types.ts
└── globals.css
```

---

## Images in `/public`

These image files must exist in your `/public` folder:

```
/excel.webp
/powerbi.webp
/sql.webp
/python.webp
/ai.webp
/powerquery.webp
/logo.png
/hero-image.webp
```

If an image is missing, show a gray placeholder div with the course title as text.
