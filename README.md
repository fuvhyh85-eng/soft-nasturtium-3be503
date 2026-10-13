# Noor Bazaar

A modern, mobile-first online store for Pakistan. It sells fashion, accessories, home goods, beauty and electronics, with prices in PKR (`Rs. 1,999`), Cash on Delivery messaging and WhatsApp support.

## What's live

- **Homepage**: hero, categories, featured products, flash deals with countdown, best sellers, new arrivals, testimonials, newsletter signup.
- **Shop** (`/shop`): search, filters (category/subcategory, price, rating, availability, sale), sorting and Load More.
- **Product pages** (`/products/:slug`): image gallery with zoom, variants, quantity, Add to Cart / Buy Now, specs, reviews, related products and SEO structured data.
- **Cart** (drawer + `/cart`): quantities, coupons (`WELCOME10`, `FLAT500`), delivery charges, a free-delivery progress bar, and ordering via WhatsApp.
- **Wishlist** (`/wishlist`), **FAQs and policies** (`/help/faq`, `/help/shipping-policy`, …).

Cart and wishlist are saved in the browser. Catalog data currently comes from `src/data/catalog.ts`.

## Tech stack

- [TanStack Start](https://tanstack.com/start) (React 19, TypeScript, file-based routing, SSR)
- Tailwind CSS 4
- Netlify: hosting, Image CDN (all product images go through `/.netlify/images`), Forms (newsletter)
- Planned: Netlify Database (Postgres + Drizzle), Netlify Identity, Netlify Blobs

## Run locally

```bash
pnpm install
netlify dev          # http://localhost:8888, emulates Image CDN & Forms
# or: pnpm dev       # plain Vite on http://localhost:3000
```

## Customize the store

- Store name, contact details, WhatsApp number, socials, shipping fees and announcement bar: `src/config/store.ts`. **Set `whatsappNumber` to your real business number before launch.**
- Products, categories, reviews, coupons, FAQs and policy text: `src/data/catalog.ts`
- Colors and fonts: `src/styles.css` (`@theme` block)

## Deploy

Push to the connected Git repo and Netlify builds it (`vite build`, publishing `dist/client`). Newsletter signups appear under **Forms** in the Netlify dashboard.

## Roadmap

The next milestones are the database-backed catalog, customer accounts, checkout and order management, JazzCash/Easypaisa/bank transfer/card payments with verified payment status, the admin dashboard, and notifications. See [PLAN.md](./PLAN.md) for details and the environment variables each step needs.
