# Superadmin & RBAC Guide

## Role Hierarchy

```
superadmin  →  full access to everything, no restrictions
admin       →  access only to what permissions allow
user        →  student, no admin access
```

---

## Permissions

An admin can be granted any combination of these 6 permissions:

| Permission | Controls |
|---|---|
| `manage_courses` | Create, edit, delete, toggle courses |
| `manage_users` | View, verify, unenroll, delete students |
| `manage_testimonials` | Create, edit, delete, toggle testimonials |
| `manage_orders` | View all orders |
| `manage_stats` | Update platform stats |
| `upload_media` | Upload course images, videos, delete files |

Superadmin bypasses all permission checks — always has full access.

---

## Token

After login, the token payload includes `permissions`:

```ts
// Decoded token for a superadmin
{ id, name, email, role: 'superadmin', permissions: [] }

// Decoded token for an admin with 2 permissions
{ id, name, email, role: 'admin', permissions: ['manage_courses', 'upload_media'] }

// Decoded token for a student
{ id, name, email, role: 'user', permissions: [] }
```

Use this on the frontend to show/hide UI elements:

```ts
const user = getAuthUser(); // decoded from localStorage token

const canManageCourses     = user.role === 'superadmin' || user.permissions.includes('manage_courses');
const canManageUsers       = user.role === 'superadmin' || user.permissions.includes('manage_users');
const canManageTestimonials = user.role === 'superadmin' || user.permissions.includes('manage_testimonials');
const canManageOrders      = user.role === 'superadmin' || user.permissions.includes('manage_orders');
const canManageStats       = user.role === 'superadmin' || user.permissions.includes('manage_stats');
const canUploadMedia       = user.role === 'superadmin' || user.permissions.includes('upload_media');
```

---

## Updated Types (add to frontend)

```ts
export type Role = 'superadmin' | 'admin' | 'user';

export type Permission =
  | 'manage_courses'
  | 'manage_users'
  | 'manage_testimonials'
  | 'manage_orders'
  | 'manage_stats'
  | 'upload_media';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  permissions: Permission[];
}

// Admin object returned from /api/superadmin/admins
export interface Admin {
  _id: string;
  name: string;
  email: string;
  role: 'admin';
  permissions: Permission[];
  phone: string | null;
  avatar: string | null;
  createdAt: string;
  updatedAt: string;
}
```

---

## Superadmin Endpoints — `/api/superadmin`

All require `role: superadmin` JWT.

---

### GET `/api/superadmin/admins`
List all admin accounts with their permissions.

```ts
const admins = await apiFetch<Admin[]>('/api/superadmin/admins');
```

---

### GET `/api/superadmin/admins/:id`
Get a single admin by MongoDB `_id`.

```ts
const admin = await apiFetch<Admin>(`/api/superadmin/admins/${id}`);
```

---

### PATCH `/api/superadmin/admins/:id/permissions`
Replace an admin's entire permissions array at once.

```ts
await apiFetch(`/api/superadmin/admins/${id}/permissions`, {
  method: 'PATCH',
  body: JSON.stringify({
    permissions: ['manage_courses', 'upload_media'],
  }),
});
```

Use this for the "Save permissions" button on the admin edit page.

---

### PATCH `/api/superadmin/admins/:id/grant`
Add a single permission to an admin.

```ts
await apiFetch(`/api/superadmin/admins/${id}/grant`, {
  method: 'PATCH',
  body: JSON.stringify({ permission: 'manage_users' }),
});
```

Use this for individual permission toggle switches (on → grant).

---

### PATCH `/api/superadmin/admins/:id/revoke`
Remove a single permission from an admin.

```ts
await apiFetch(`/api/superadmin/admins/${id}/revoke`, {
  method: 'PATCH',
  body: JSON.stringify({ permission: 'manage_users' }),
});
```

Use this for individual permission toggle switches (off → revoke).

---

### DELETE `/api/superadmin/admins/:id`
Delete an admin account permanently.

```ts
await apiFetch(`/api/superadmin/admins/${id}`, { method: 'DELETE' });
```

---

### GET `/api/superadmin/permissions`
Returns the list of all valid permission strings.

```ts
const permissions = await apiFetch<Permission[]>('/api/superadmin/permissions');
// ['manage_courses', 'manage_users', 'manage_testimonials', 'manage_orders', 'manage_stats', 'upload_media']
```

Use this to dynamically render the permissions checklist.

---

### POST `/api/auth/create-admin`
Create a new admin account. Now **superadmin only** (was previously admin).

```ts
await apiFetch('/api/auth/create-admin', {
  method: 'POST',
  body: JSON.stringify({ name, email, password }),
});
// New admin is created with permissions: [] — assign permissions separately
```

---

## New Pages

### `/admin/superadmin/admins`
**Access:** Superadmin only

```ts
const admins = await apiFetch<Admin[]>('/api/superadmin/admins');
```

**Table columns:** Name, Email, Permissions (badges), Created, Actions

**Actions per row:**
- Edit permissions → `/admin/superadmin/admins/[id]`
- Delete → confirm → `DELETE /api/superadmin/admins/:id`

**Top bar:** "Create Admin" button → `/admin/superadmin/admins/new`

---

### `/admin/superadmin/admins/new`
**Access:** Superadmin only

**Step 1 — Create account:**
```ts
await apiFetch('/api/auth/create-admin', {
  method: 'POST',
  body: JSON.stringify({ name, email, password }),
});
```

**Step 2 — Assign permissions (on same page after creation):**
```ts
await apiFetch(`/api/superadmin/admins/${newAdmin._id}/permissions`, {
  method: 'PATCH',
  body: JSON.stringify({ permissions: selectedPermissions }),
});
```

**UI:**
- Form: Name, Email, Password
- Permissions checklist (fetch from `GET /api/superadmin/permissions`)
- Submit creates admin then sets permissions in one flow

---

### `/admin/superadmin/admins/[id]`
**Access:** Superadmin only

```ts
const admin = await apiFetch<Admin>(`/api/superadmin/admins/${id}`);
const allPermissions = await apiFetch<Permission[]>('/api/superadmin/permissions');
```

**UI:**
- Admin info: name, email, joined date
- Permissions section — toggle switch per permission:
  - On → `PATCH /api/superadmin/admins/:id/grant { permission }`
  - Off → `PATCH /api/superadmin/admins/:id/revoke { permission }`
- "Save All" button → `PATCH /api/superadmin/admins/:id/permissions` with full array
- Delete admin button

---

## Sidebar — conditional rendering

Show sidebar items based on role and permissions:

```ts
const user = getAuthUser();

const sidebarItems = [
  { label: 'Dashboard',     href: '/admin/dashboard',    show: true },
  { label: 'Courses',       href: '/admin/courses',       show: canManageCourses },
  { label: 'Testimonials',  href: '/admin/testimonials',  show: canManageTestimonials },
  { label: 'Users',         href: '/admin/users',         show: canManageUsers },
  { label: 'Orders',        href: '/admin/orders',        show: canManageOrders },
  { label: 'Settings',      href: '/admin/settings',      show: canManageStats },
  { label: 'Admin Accounts',href: '/admin/superadmin/admins', show: user.role === 'superadmin' },
];
```

---

## How to create the first superadmin

There is no API endpoint to create a superadmin — it must be done directly in the database. Run this once:

```ts
// Add to src/seed.ts or run as a one-off script
import User from './models/User';

await User.create({
  name: 'Super Admin',
  email: 'superadmin@skillcourse.in',
  password: 'your-strong-password', // will be hashed automatically
  role: 'superadmin',
  permissions: [],
  verified: true,
});
```

Or via MongoDB Atlas directly — set `role: "superadmin"` on the user document.

---

## Permission error response

When an admin tries an action they don't have permission for:

```json
{ "success": false, "error": "Forbidden: requires 'manage_courses' permission" }
```

Handle this on the frontend:

```ts
try {
  await apiFetch('/api/courses', { method: 'POST', body: ... });
} catch (err) {
  if (err.message.includes('Forbidden')) {
    toast.error("You don't have permission to perform this action");
  }
}
```
