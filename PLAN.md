# Noor Bazaar — Product Roadmap

A full e-commerce platform for Pakistan: storefront, customer accounts, checkout with local payment methods, order management and an admin dashboard. It is delivered in self-contained milestones so each one ships something usable.

## ✅ Milestone 1 — Branded storefront (done)

- Homepage: announcement bar, sticky header with search/wishlist/cart, category mega-nav, hero, trust strip, category tiles, featured products, flash deals with countdown, best sellers, new arrivals, testimonials, newsletter (Netlify Forms), footer.
- Shop (`/shop`): search, category + subcategory, price, rating, availability and sale filters, five sort orders, Load More pagination, active-filter chips, no-results state. All state lives in the URL.
- Product details (`/products/:slug`): gallery with hover zoom, variants, quantity, Add to Cart, Buy Now, stock status, delivery info, description/specs/reviews tabs, related products, Product JSON-LD.
- Cart drawer + cart page: quantity updates, removal, coupons (`WELCOME10`, `FLAT500`), free-delivery progress, totals, persisted in `localStorage`. Orders can be sent through WhatsApp for now.
- Wishlist (`/wishlist`), FAQs and policy pages (`/help/:slug`), WhatsApp floating button, 404 page.
- All catalog content comes from `src/data/catalog.ts`.

## Milestone 2 — Database & real catalog

- Netlify Database (Postgres) with Drizzle: `categories`, `products`, `product_images`, `product_variants` (with per-variant stock), `reviews`, `coupons`.
- Seed migration from the current fixtures.
- Replace the `catalog.ts` helpers with server functions (`createServerFn`) running server-side filtering, sorting and pagination. Keep the same signatures so the UI barely changes.
- Product images in Netlify Blobs, served through the Image CDN.

## Milestone 3 — Customer accounts

- Netlify Identity: sign up, login, logout, password reset. Passwords are handled by Identity and never touch our database.
- `customers` and `addresses` tables. Profile page, saved addresses.
- Wishlist and cart sync to the account on login, merging with guest `localStorage` state.
- Roles: `customer`, `admin` (Identity app_metadata), checked on the server.

## Milestone 4 — Checkout & orders

- `/checkout`: name, phone (PK format validation), optional email, address, city, postal code, order summary, delivery charges, coupon. Guest checkout supported.
- Server-side re-pricing: totals, coupon validity and stock are always recomputed on the server. Client values are never trusted.
- `orders` + `order_items` tables, unique order numbers (e.g. `NB-2610-4F7K`), timestamps and status history.
- Statuses: Pending → Confirmed → Processing → Shipped → Delivered, plus Cancelled and Returned.
- Order confirmation page, order history in the account, and a public `/track` page (order number + phone).
- Stock reserved atomically when an order is placed.
- Rate limiting on checkout, login and coupon endpoints.

## Milestone 5 — Pakistani payment methods

- **Cash on Delivery**: live as soon as checkout exists.
- **Bank transfer**: show bank details, let the customer upload a receipt (Blobs), and have an admin verify it before marking the order paid.
- **JazzCash, Easypaisa, cards** (via a PK gateway such as PayFast, Safepay or the JazzCash/Easypaisa merchant APIs): server-side payment initiation, plus webhook/IPN handlers that verify the provider signature and status before setting `payment_status = paid`. Payments are never simulated.
- Each method appears only when its credentials are configured. Otherwise checkout shows "requires configuration".

## Milestone 6 — Admin dashboard

- `/admin/*` routes protected by server-side role checks on every request.
- Product CRUD with image uploads, variants, prices, discounts and inventory.
- Category management, coupon builder, customer list.
- Order queue with status updates and payment verification.
- Analytics: revenue, order count, AOV, best sellers, sales over time.

## Milestone 7 — Notifications & extras

- Email (Resend/Postmark) and SMS (e.g. Twilio or a local SMS gateway) order confirmations and status updates, enabled only when credentials exist.
- Contact form (Netlify Forms), customers can write reviews after purchase, sitemap.xml/robots.txt.
- Accessibility and performance pass: Lighthouse, keyboard audit.

## Planned environment variables

| Variable | Milestone | Purpose |
|---|---|---|
| `NETLIFY_DB_URL` (auto) | 2 | Netlify Database connection (provisioned automatically) |
| `SITE_URL` | 4 | Absolute URLs for payment callbacks |
| `JAZZCASH_MERCHANT_ID`, `JAZZCASH_PASSWORD`, `JAZZCASH_INTEGRITY_SALT` | 5 | JazzCash |
| `EASYPAISA_STORE_ID`, `EASYPAISA_HASH_KEY` | 5 | Easypaisa |
| `PAYMENT_GATEWAY_*` (e.g. Safepay/PayFast keys) | 5 | Card payments |
| `BANK_ACCOUNT_TITLE`, `BANK_IBAN`, `BANK_NAME` | 5 | Bank transfer details |
| `EMAIL_API_KEY`, `SMS_API_KEY` | 7 | Notifications |
