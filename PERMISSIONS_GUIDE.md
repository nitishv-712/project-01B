# Permissions & RBAC — Frontend Guide

## Types (copy to frontend)

```ts
export type Role = 'superadmin' | 'admin' | 'user';

export type Permission =
  | 'courses:read'
  | 'courses:create'
  | 'courses:update'
  | 'courses:delete'
  | 'users:read'
  | 'users:update'
  | 'users:delete'
  | 'testimonials:read'
  | 'testimonials:create'
  | 'testimonials:update'
  | 'testimonials:delete'
  | 'orders:read'
  | 'stats:read'
  | 'stats:update'
  | 'media:upload'
  | 'media:delete'
  | 'profile:manage_own';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  permissions: Permission[];
}
```

---

## Token payload

After login the JWT contains:

```json
{
  "id": "mongo_id",
  "name": "John",
  "email": "john@example.com",
  "role": "admin",
  "permissions": ["courses:read", "courses:create", "media:upload", "profile:manage_own"]
}
```

- `superadmin` — `permissions: []` (bypasses all checks server-side, show everything on frontend)
- `admin` — `permissions` contains only what superadmin granted
- `user` — `permissions: []` (student, no admin access)

---

## Permission helper (add to your auth utils)

```ts
import { jwtDecode } from 'jwt-decode';

export function getAuthUser(): AuthUser | null {
  const token = localStorage.getItem('sc_token');
  if (!token) return null;
  try { return jwtDecode<AuthUser>(token); } catch { return null; }
}

export function can(permission: Permission): boolean {
  const user = getAuthUser();
  if (!user) return false;
  if (user.role === 'superadmin') return true;
  return user.permissions.includes(permission);
}

export function isSuperAdmin(): boolean { return getAuthUser()?.role === 'superadmin'; }
export function isAdmin(): boolean { return getAuthUser()?.role === 'admin'; }
export function isStudent(): boolean { return getAuthUser()?.role === 'user'; }
```

Usage anywhere in the app:

```ts
can('courses:read')    // can this user view the courses list?
can('courses:create')  // can this user add a new course?
can('users:delete')    // can this user delete a student?
```

---

## Permission → Endpoint map

| Permission | Unlocks |
|---|---|
| `courses:read` | `GET /api/courses/all` |
| `courses:create` | `POST /api/courses` |
| `courses:update` | `PUT /api/courses/:id`, `PATCH /api/courses/:id/toggle` |
| `courses:delete` | `DELETE /api/courses/:id` |
| `users:read` | `GET /api/users`, `GET /api/users/:id` |
| `users:update` | `PATCH /api/users/:id/verify`, `PATCH /api/users/:id/unenroll` |
| `users:delete` | `DELETE /api/users/:id` |
| `testimonials:read` | `GET /api/testimonials/all` |
| `testimonials:create` | `POST /api/testimonials` |
| `testimonials:update` | `PUT /api/testimonials/:id`, `PATCH /api/testimonials/:id/toggle` |
| `testimonials:delete` | `DELETE /api/testimonials/:id` |
| `orders:read` | `GET /api/payment/orders/all` |
| `stats:read` | (public, but use to show stats section in admin) |
| `stats:update` | `PUT /api/stats` |
| `media:upload` | `POST /api/upload/course-image`, `POST /api/upload/course-video` |
| `media:delete` | `DELETE /api/upload/course-video/:id`, `DELETE /api/upload/file` |
| `profile:manage_own` | `PATCH /api/auth/profile` (own profile only) |

---

## Preset bundles

`GET /api/superadmin/permissions` returns both the full list and presets:

```ts
const { permissions, presets } = await apiFetch('/api/superadmin/permissions');
```

```ts
presets = {
  full_admin:      [...all 17 permissions],
  course_manager:  ['courses:read', 'courses:create', 'courses:update', 'courses:delete', 'media:upload', 'media:delete', 'profile:manage_own'],
  content_editor:  ['courses:read', 'courses:update', 'testimonials:read', 'testimonials:create', 'testimonials:update', 'testimonials:delete', 'media:upload', 'profile:manage_own'],
  user_manager:    ['users:read', 'users:update', 'users:delete', 'orders:read', 'profile:manage_own'],
  viewer:          ['courses:read', 'users:read', 'testimonials:read', 'orders:read', 'stats:read', 'profile:manage_own'],
}
```

Use on the create/edit admin page:

```tsx
<select onChange={(e) => setSelected(presets[e.target.value])}>
  <option value="">Custom</option>
  <option value="full_admin">Full Admin</option>
  <option value="course_manager">Course Manager</option>
  <option value="content_editor">Content Editor</option>
  <option value="user_manager">User Manager</option>
  <option value="viewer">Viewer</option>
</select>
```

---

## Sidebar — show/hide based on permissions

```ts
const user = getAuthUser();

const nav = [
  { label: 'Dashboard',    href: '/admin/dashboard',             show: true },
  { label: 'Courses',      href: '/admin/courses',               show: can('courses:read') },
  { label: 'Testimonials', href: '/admin/testimonials',          show: can('testimonials:read') },
  { label: 'Users',        href: '/admin/users',                 show: can('users:read') },
  { label: 'Orders',       href: '/admin/orders',                show: can('orders:read') },
  { label: 'Settings',     href: '/admin/settings',              show: can('stats:update') },
  { label: 'Admins',       href: '/admin/superadmin/admins',     show: isSuperAdmin() },
];
```

---

## Page-level guards

```ts
// Courses list page
if (!can('courses:read')) redirect('/admin/dashboard');

// New course page
if (!can('courses:create')) redirect('/admin/courses');

// Edit course page
if (!can('courses:update')) redirect('/admin/courses');
```

---

## Button-level guards (hide actions the admin can't do)

```tsx
// Courses table row
{can('courses:update') && <ToggleSwitch />}
{can('courses:update') && <EditButton />}
{can('courses:delete') && <DeleteButton />}
{can('courses:create') && <AddCourseButton />}

// Course edit page — video section
{can('media:upload') && <VideoUploadSection />}
{can('media:delete') && <RemoveVideoButton />}

// Users table row
{can('users:update') && <VerifyToggle />}
{can('users:delete') && <DeleteButton />}

// Testimonials table row
{can('testimonials:update') && <ToggleSwitch />}
{can('testimonials:update') && <EditButton />}
{can('testimonials:delete') && <DeleteButton />}
{can('testimonials:create') && <AddTestimonialButton />}
```

---

## Profile update — works for both students and admins

`PATCH /api/auth/profile` is available to:
- All students (`role: user`) — always
- Admins with `profile:manage_own` permission
- Superadmin — always

```ts
// Show profile edit on dashboard for students
// Show profile edit on /admin/settings for admins
const canEditProfile = isStudent() || isSuperAdmin() || can('profile:manage_own');
```

---

## Superadmin — assign permissions to an admin

### Replace all permissions at once (Save button)
```ts
await apiFetch(`/api/superadmin/admins/${adminId}/permissions`, {
  method: 'PATCH',
  body: JSON.stringify({ permissions: selectedPermissions }),
});
```

### Toggle a single permission (checkbox/switch)
```ts
// Grant
await apiFetch(`/api/superadmin/admins/${adminId}/grant`, {
  method: 'PATCH',
  body: JSON.stringify({ permission: 'courses:create' }),
});

// Revoke
await apiFetch(`/api/superadmin/admins/${adminId}/revoke`, {
  method: 'PATCH',
  body: JSON.stringify({ permission: 'courses:create' }),
});
```

---

## Permission checklist UI (admin edit page)

Group permissions by resource for a clean UI:

```ts
const PERMISSION_GROUPS = [
  {
    label: 'Courses',
    permissions: ['courses:read', 'courses:create', 'courses:update', 'courses:delete'],
  },
  {
    label: 'Users',
    permissions: ['users:read', 'users:update', 'users:delete'],
  },
  {
    label: 'Testimonials',
    permissions: ['testimonials:read', 'testimonials:create', 'testimonials:update', 'testimonials:delete'],
  },
  {
    label: 'Orders',
    permissions: ['orders:read'],
  },
  {
    label: 'Stats',
    permissions: ['stats:read', 'stats:update'],
  },
  {
    label: 'Media',
    permissions: ['media:upload', 'media:delete'],
  },
  {
    label: 'Profile',
    permissions: ['profile:manage_own'],
  },
];
```

Render as grouped checkboxes. On toggle → call grant or revoke endpoint immediately (no save button needed), or collect all and call the bulk permissions endpoint on Save.

---

## Error handling

When an admin hits an endpoint they don't have permission for:

```json
{ "success": false, "error": "Forbidden: requires 'courses:create' permission" }
```

```ts
try {
  await apiFetch('/api/courses', { method: 'POST', body: ... });
} catch (err) {
  if (err.message.startsWith('Forbidden')) {
    toast.error("You don't have permission to do this");
  }
}
```
