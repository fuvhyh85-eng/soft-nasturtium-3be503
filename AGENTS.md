# AGENTS.md

Guide for AI agents and developers working on **Noor Bazaar**, a Pakistani e-commerce storefront built with TanStack Start and deployed on Netlify.

**Continue from [PLAN.md](./PLAN.md).** Milestone 1 (the storefront UI) is complete. Start the next session at Milestone 2 (database).

## Stack

TanStack Start (React 19, TanStack Router file routes, SSR) · TypeScript strict · Tailwind CSS 4 (`@theme` tokens in `src/styles.css`) · lucide-react icons · zod · Netlify Image CDN + Forms. Package manager: **pnpm**.

## Layout

```
src/
  config/store.ts        # Branding, contact, WhatsApp, shipping fees, announcements (single source)
  data/catalog.ts        # ALL catalog fixtures + query helpers (getProductBySlug, bestSellers, …)
  lib/
    shop.tsx             # ShopProvider: cart, wishlist, coupon state, totals (localStorage)
    shop-search.ts       # Zod-validated /shop search params + ShopSearch type
    format.ts            # formatPKR ("Rs. 1,999"), img() Image CDN URL builder, cn()
  components/            # Header (announcement bar, search, mega-nav), Footer, ProductCard,
                         # CartDrawer, CartSummary (coupon/totals), Newsletter, Price, Stars, …
  routes/
    __root.tsx           # Shell: ShopProvider, Header, Footer, CartDrawer, WhatsApp button, 404
    index.tsx            # Homepage
    shop.tsx             # Catalog with URL-driven filters/sort/load-more
    products/$slug.tsx   # Product details (+ Product JSON-LD)
    cart.tsx, wishlist.tsx
    help/$slug.tsx       # FAQ + policy pages from catalog.ts
public/
  img/                   # Generated product/category/hero images (always serve via img())
  __forms.html           # Netlify Forms registration skeleton (newsletter)
```

## Conventions & decisions

- **Prices** are whole rupees (integers). Always render them with `formatPKR`.
- **Images**: never reference `/img/*.png` directly in markup. Use `img(src, width, opts)` so the Image CDN resizes the image and serves WebP.
- **Fixtures**: UI code only imports data through `@/data/catalog`. When the database lands, replace those exports with server functions that keep the same shapes (`Product`, `Category`, `Review`, `Coupon`).
- **Cart totals** are computed in `computeTotals` (`lib/shop.tsx`). Coupons are validated client-side only for now. Checkout must re-validate everything on the server (PLAN.md, Milestone 4).
- **Shop state lives in the URL** (`validateShopSearch`). Use the `ShopSearch` type when linking to `/shop`.
- Products with variants show "Choose options" on cards, so shoppers pick a variant on the details page.
- Online checkout is intentionally disabled with a "launching soon" note. The WhatsApp order button is the interim path. Don't fake payment success.
- **Newsletter** posts URL-encoded data to `/__forms.html` (it can't post to `/`, because SSR would intercept it). If you add a field, update the skeleton too.
- The account icon is a non-link placeholder until Netlify Identity is added (Milestone 3).
- Styling: emerald/saffron/ivory tokens, with `font-display` (Fraunces) for headings and Manrope for body text.
