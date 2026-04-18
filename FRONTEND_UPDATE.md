# Frontend Update — Avatar, Phone & Verified

## What changed

3 new fields added to every user/student object returned by the API:

| Field | Type | Default | Notes |
|---|---|---|---|
| `phone` | `string \| null` | `null` | e.g. `"+91 98765 43210"` |
| `avatar` | `string \| null` | `null` | URL or path e.g. `"/avatars/rahul.webp"` |
| `verified` | `boolean` | `false` | Admin can toggle this |

---

## Update your Student type

```ts
export interface Student {
  _id: string;
  name: string;
  email: string;
  role: 'user';
  phone: string | null;       // NEW
  avatar: string | null;      // NEW
  verified: boolean;          // NEW
  enrolledCourses: string[];
  createdAt: string;
  updatedAt: string;
}
```

---

## New Endpoints

### PATCH `/api/auth/profile` — student only
Student updates their own name, phone, avatar. Only send fields you want to change.

```ts
await apiFetch('/api/auth/profile', {
  method: 'PATCH',
  body: JSON.stringify({ phone: '+91 98765 43210', avatar: '/avatars/rahul.webp' }),
});
// returns updated student object (no password)
```

**Updatable:** `name`, `phone`, `avatar`

---

### PATCH `/api/users/:id/verify` — admin only
Toggles `verified` on/off for a student.

```ts
const result = await apiFetch<{ _id: string; verified: boolean }>(
  `/api/users/${id}/verify`,
  { method: 'PATCH' }
);
// result.verified = new boolean value
```

---

## Pages to update

### `/dashboard/profile` or `/dashboard/settings` — student
Add a profile edit form with:
- Avatar — image URL or file path input
- Phone — text input
- Name — text input (already exists, now editable here too)
- Save → `PATCH /api/auth/profile`
- Show current avatar using `<img src={student.avatar ?? '/default-avatar.png'} />`

### `/dashboard` — student
- Show avatar in the welcome/header section
- Show phone if present in profile card
- Show a verified badge (e.g. blue checkmark) if `verified === true`

### `/admin/users` — admin
- Add `verified` column to the users table
- Toggle button per row → `PATCH /api/users/:id/verify`
- Show avatar thumbnail in the name column

### `/admin/users/[id]` — admin
- Show avatar, phone, verified status in student detail view
- Verify/Unverify button → `PATCH /api/users/:id/verify`

---

## Avatar display rule

```ts
// Use this everywhere an avatar is shown
const avatarSrc = student.avatar ?? '/default-avatar.png';
```

Make sure `/default-avatar.png` exists in your `/public` folder.
