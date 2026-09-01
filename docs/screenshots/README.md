# Screenshots

Captured from the dev server with Playwright, not by hand — so they can be regenerated
whenever the UI moves.

| File | Page | Viewport |
|------|------|----------|
| `home.png` | `/` — hero | 1440 × 900 |
| `services.png` | `/` — price list | 1440 × 900 |
| `booking.png` | `/booking` — barber and day pickers, summary bar | 1440 × 900 |
| `shop.png` | `/shop` — catalogue | 1440 × 900 |
| `shop-product.png` | `/shop` — product modal | 1440 × 900 |
| `admin.png` | `/admin/appointments` — day book | 1440 × 900 |
| `admin-products.png` | `/admin/products` — catalogue editor | 1440 × 900 |
| `mobile-home.png` | `/` | 390 × 844 @2x |
| `mobile-booking.png` | `/booking` | 390 × 844 @2x |
| `mobile-shop.png` | `/shop` | 390 × 844 @2x |

## Regenerating

The capture script is not committed — it is a few dozen lines against a running dev server.
To redo them: `npm run dev`, then drive Chromium with Playwright, sign in through `/login`,
unlock `/admin` with the passcode, and screenshot each route.

One trap worth knowing: scope any submit click to its own form
(`form:has(#passcode) button[type="submit"]`). A bare `button[type="submit"]` matches the
sign-out button in the header first, which logs the session out mid-run.
