# Frontend Update — Payment & Enrollment Flow

## What changed

- `enrollUrl` is removed from all course objects — it no longer exists
- `POST /api/auth/enroll` is removed — enrollment now only happens after payment
- New payment flow: initiate → confirm → enrolled
- A dummy payment method is in place until Razorpay is connected

---

## New Type

```ts
export type OrderStatus = 'pending' | 'paid' | 'failed';

export interface Order {
  _id: string;
  userId: string;
  courseId: string;       // course id slug e.g. 'excel'
  amount: number;         // in INR
  status: OrderStatus;
  paymentMethod: string;  // 'dummy' for now, 'razorpay' later
  transactionId: string;
  createdAt: string;
  updatedAt: string;
}
```

Also remove `enrollUrl` from your `Course` type — that field is gone.

---

## Payment Flow

```
1. Student clicks "Buy Now" on course page
2. POST /api/payment/initiate  →  get back transactionId + orderId
3. Show dummy payment UI (see below)
4. Student clicks "Pay Now" (dummy confirm)
5. POST /api/payment/confirm   →  student is enrolled
6. Redirect to /dashboard
```

---

## Endpoints

### POST `/api/payment/initiate` — student only

Creates a pending order. Call this when student clicks "Buy Now".

```ts
const data = await apiFetch<{
  orderId: string;
  transactionId: string;
  amount: number;
  courseId: string;
  courseTitle: string;
  paymentMethod: 'dummy';
}>('/api/payment/initiate', {
  method: 'POST',
  body: JSON.stringify({ courseId: 'excel' }),
});
// store data.transactionId in state — needed for confirm step
```

**Errors:**
- `404` — course not found or inactive
- `400` — already enrolled

---

### POST `/api/payment/confirm` — student only

Confirms the payment and enrolls the student. Call this when student clicks "Pay Now".

```ts
await apiFetch('/api/payment/confirm', {
  method: 'POST',
  body: JSON.stringify({ transactionId: data.transactionId }),
});
// student is now enrolled — redirect to /dashboard
```

---

### GET `/api/payment/orders` — student only

Student's full order history.

```ts
const orders = await apiFetch<Order[]>('/api/payment/orders');
```

**Use on:** `/dashboard` — order history section

---

### GET `/api/payment/orders/all` — admin only

All orders across all students.

```ts
const orders = await apiFetch<Order[]>('/api/payment/orders/all');
```

**Use on:** `/admin/orders`

---

## Dummy Payment UI

Since there's no real payment gateway yet, show a simple fake checkout page:

**Route:** `/checkout/[courseId]`

**Flow:**
1. On page load → call `POST /api/payment/initiate`
2. Show a card with:
   - Course title
   - Amount (e.g. ₹1,699)
   - Dummy card fields (just for UI — not validated): Card Number, Expiry, CVV
   - "Pay ₹{amount}" button
3. On button click → call `POST /api/payment/confirm` with the `transactionId`
4. On success → show "Payment Successful!" message → redirect to `/dashboard` after 2 seconds

```ts
// Checkout page logic
const [transactionId, setTransactionId] = useState('');

// Step 1 — on mount
useEffect(() => {
  apiFetch('/api/payment/initiate', {
    method: 'POST',
    body: JSON.stringify({ courseId: params.courseId }),
  }).then(data => setTransactionId(data.transactionId));
}, []);

// Step 2 — on Pay button click
async function handlePay() {
  await apiFetch('/api/payment/confirm', {
    method: 'POST',
    body: JSON.stringify({ transactionId }),
  });
  router.push('/dashboard');
}
```

---

## Update course detail page `/course/[id]`

Replace the old "Enroll Now" button logic with:

```ts
// Old — REMOVE THIS
<a href={course.enrollUrl} target="_blank">Enroll Now</a>

// New
<button onClick={() => router.push(`/checkout/${course.id}`)}>
  Buy Now — ₹{course.price}
</button>
```

Button states:
- Not logged in → "Login to Buy" → redirect to `/login?redirect=/course/[id]`
- Already enrolled → "Go to Course" (no buy button)
- Not enrolled + logged in → "Buy Now" → redirect to `/checkout/[id]`

---

## Razorpay — when you're ready

The backend has `// TODO: Razorpay` comments in `src/routes/payment.ts` at exactly the two spots to replace:

1. In `POST /api/payment/initiate` — replace dummy order creation with `razorpay.orders.create(...)`
2. In `POST /api/payment/confirm` — replace dummy confirm with Razorpay signature verification

On the frontend, when Razorpay is active:
- Load Razorpay checkout script
- Open Razorpay modal with `orderId`, `amount`, `key` returned from `/api/payment/initiate`
- On `payment.success` handler → call `POST /api/payment/confirm` with `{ transactionId: response.razorpay_payment_id, razorpay_order_id, razorpay_signature }`

No other frontend changes needed — the confirm endpoint interface stays the same.

---

## Pages to add/update

| Page | Change |
|---|---|
| `/course/[id]` | Replace `enrollUrl` link with "Buy Now" → `/checkout/[id]` |
| `/checkout/[courseId]` | New page — dummy payment UI |
| `/dashboard` | Add order history section using `GET /api/payment/orders` |
| `/admin/orders` | New page — all orders table using `GET /api/payment/orders/all` |
