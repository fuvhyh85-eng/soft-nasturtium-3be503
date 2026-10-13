import { bigint, boolean, index, integer, jsonb, pgTable, primaryKey, real, serial, text, timestamp, unique } from 'drizzle-orm/pg-core'

export const categories = pgTable('categories', {
  slug: text().primaryKey(),
  name: text().notNull(),
  blurb: text().notNull().default(''),
  image: text().notNull(),
  position: integer().notNull().default(0),
})

export const subcategories = pgTable(
  'subcategories',
  {
    categorySlug: text('category_slug').notNull().references(() => categories.slug, { onDelete: 'cascade' }),
    slug: text().notNull(),
    name: text().notNull(),
    position: integer().notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.categorySlug, t.slug] })],
)

export const products = pgTable(
  'products',
  {
    // Matches the supplier export ID so later CSV imports can upsert by id.
    id: bigint({ mode: 'number' }).primaryKey(),
    slug: text().notNull().unique(),
    name: text().notNull(),
    brand: text(),
    categorySlug: text('category_slug').notNull().references(() => categories.slug),
    subcategorySlug: text('subcategory_slug').notNull(),
    price: integer().notNull(),
    compareAt: integer('compare_at'),
    rating: real().notNull().default(0),
    reviewCount: integer('review_count').notNull().default(0),
    stock: integer().notNull().default(0),
    sold: integer().notNull().default(0),
    // Internal supplier reference; never sent to the storefront.
    supplierCode: text('supplier_code').unique(),
    featured: boolean().notNull().default(false),
    active: boolean().notNull().default(true),
    shortDescription: text('short_description').notNull().default(''),
    description: text().notNull().default(''),
    highlights: jsonb().$type<Array<string>>().notNull().default([]),
    specs: jsonb().$type<Record<string, string>>().notNull().default({}),
    variants: jsonb().$type<Array<{ name: string; options: Array<string> }>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('products_category_idx').on(t.categorySlug, t.subcategorySlug), index('products_price_idx').on(t.price)],
)

export const productImages = pgTable(
  'product_images',
  {
    id: serial().primaryKey(),
    productId: bigint('product_id', { mode: 'number' }).notNull().references(() => products.id, { onDelete: 'cascade' }),
    url: text().notNull(),
    position: integer().notNull().default(0),
  },
  (t) => [unique('product_images_product_position').on(t.productId, t.position)],
)

export const reviews = pgTable(
  'reviews',
  {
    id: serial().primaryKey(),
    productId: bigint('product_id', { mode: 'number' }).notNull().references(() => products.id, { onDelete: 'cascade' }),
    author: text().notNull(),
    city: text().notNull().default(''),
    rating: integer().notNull(),
    title: text().notNull().default(''),
    body: text().notNull().default(''),
    verified: boolean().notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('reviews_product_idx').on(t.productId)],
)

export const coupons = pgTable('coupons', {
  code: text().primaryKey(),
  description: text().notNull(),
  type: text().$type<'percent' | 'flat'>().notNull(),
  value: integer().notNull(),
  minSubtotal: integer('min_subtotal').notNull().default(0),
  active: boolean().notNull().default(true),
})
