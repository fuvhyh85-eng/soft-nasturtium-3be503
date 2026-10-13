/**
 * Netlify Database queries for the storefront catalog.
 * Only imported from server function handlers in `@/data/catalog`, so it never reaches the browser.
 */
import { and, asc, count, desc, eq, gt, gte, ilike, inArray, isNotNull, lte, ne, or, sql } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { categories, coupons, productImages, products, reviews, subcategories } from '../../db/schema.js'
import type { Category, Coupon, Product, Review, StoreMeta } from '@/data/catalog'
import type { ShopSearch } from '@/lib/shop-search'

const fields = {
  id: products.id,
  slug: products.slug,
  name: products.name,
  brand: products.brand,
  category: products.categorySlug,
  subcategory: products.subcategorySlug,
  subcategoryName: subcategories.name,
  price: products.price,
  compareAt: products.compareAt,
  rating: products.rating,
  reviewCount: products.reviewCount,
  stock: products.stock,
  sold: products.sold,
  createdAt: products.createdAt,
  featured: products.featured,
  shortDescription: products.shortDescription,
  description: products.description,
  highlights: products.highlights,
  specs: products.specs,
  variants: products.variants,
}

const subJoin = and(eq(subcategories.categorySlug, products.categorySlug), eq(subcategories.slug, products.subcategorySlug))

async function select(where: SQL | undefined, orderBy: Array<SQL>, limit: number, offset = 0): Promise<Array<Product>> {
  const rows = await db
    .select(fields)
    .from(products)
    .innerJoin(categories, eq(categories.slug, products.categorySlug))
    .leftJoin(subcategories, subJoin)
    .where(and(eq(products.active, true), where))
    .orderBy(...orderBy)
    .limit(limit)
    .offset(offset)
  if (!rows.length) return []

  const images = await db
    .select({ productId: productImages.productId, url: productImages.url })
    .from(productImages)
    .where(inArray(productImages.productId, rows.map((r) => r.id)))
    .orderBy(asc(productImages.productId), asc(productImages.position))
  const byProduct = new Map<number, Array<string>>()
  for (const img of images) byProduct.set(img.productId, [...(byProduct.get(img.productId) ?? []), img.url])

  return rows.map((r) => {
    const gallery = byProduct.get(r.id) ?? []
    return {
      ...r,
      subcategoryName: r.subcategoryName ?? '',
      compareAt: r.compareAt ?? undefined,
      variants: r.variants ?? undefined,
      createdAt: r.createdAt.toISOString(),
      image: gallery[0] ?? '/img/hero.png',
      images: gallery.length ? gallery : ['/img/hero.png'],
    }
  })
}

const newest = [desc(products.createdAt), desc(products.id)]
const onSaleWhere = and(isNotNull(products.compareAt), gt(products.compareAt, products.price))

const sorters: Record<string, Array<SQL>> = {
  popular: [desc(products.featured), desc(sql`${products.rating} * ${products.reviewCount}`), ...newest],
  bestselling: [desc(products.sold), desc(products.featured), ...newest],
  newest,
  'price-asc': [asc(products.price), desc(products.id)],
  'price-desc': [desc(products.price), desc(products.id)],
}

export async function getStoreMeta(): Promise<StoreMeta> {
  const [cats, subs, codes, [sale]] = await Promise.all([
    db.select().from(categories).orderBy(asc(categories.position)),
    db.select().from(subcategories).orderBy(asc(subcategories.position)),
    db.select().from(coupons).where(eq(coupons.active, true)),
    db.select({ n: count() }).from(products).where(and(eq(products.active, true), onSaleWhere)),
  ])
  const list: Array<Category> = cats.map((c) => ({
    slug: c.slug,
    name: c.name,
    blurb: c.blurb,
    image: c.image,
    subcategories: subs.filter((s) => s.categorySlug === c.slug).map((s) => ({ slug: s.slug, name: s.name })),
  }))
  const couponList: Array<Coupon> = codes.map((c) => ({ code: c.code, description: c.description, type: c.type, value: c.value, minSubtotal: c.minSubtotal }))
  return { categories: list, coupons: couponList, saleCount: sale?.n ?? 0 }
}

const escapeLike = (s: string) => s.replace(/[\\%_]/g, '\\$&')

export async function searchProducts(s: ShopSearch, limit: number) {
  const conditions: Array<SQL | undefined> = []
  if (s.category) conditions.push(eq(products.categorySlug, s.category))
  if (s.sub) conditions.push(eq(products.subcategorySlug, s.sub))
  if (s.min !== undefined) conditions.push(gte(products.price, s.min))
  if (s.max !== undefined) conditions.push(lte(products.price, s.max))
  if (s.rating) conditions.push(gte(products.rating, s.rating))
  if (s.inStock) conditions.push(gt(products.stock, 0))
  if (s.sale) conditions.push(onSaleWhere)
  for (const term of s.q?.toLowerCase().split(/\s+/).filter(Boolean).slice(0, 6) ?? []) {
    const like = `%${escapeLike(term)}%`
    conditions.push(
      or(ilike(products.name, like), ilike(products.brand, like), ilike(categories.name, like), ilike(subcategories.name, like), ilike(products.shortDescription, like)),
    )
  }
  const where = and(...conditions)

  const [items, [total], counts] = await Promise.all([
    select(where, sorters[s.sort ?? 'popular'], limit),
    db
      .select({ n: count() })
      .from(products)
      .innerJoin(categories, eq(categories.slug, products.categorySlug))
      .leftJoin(subcategories, subJoin)
      .where(and(eq(products.active, true), where)),
    db.select({ category: products.categorySlug, n: count() }).from(products).where(eq(products.active, true)).groupBy(products.categorySlug),
  ])
  return { items, total: total?.n ?? 0, categoryCounts: Object.fromEntries(counts.map((c) => [c.category, c.n])) as Record<string, number> }
}

export async function getProductPage(slug: string) {
  const [product] = await select(eq(products.slug, slug), [], 1)
  if (!product) return null
  const [productReviews, sameSub, sameCategory] = await Promise.all([
    db.select().from(reviews).where(eq(reviews.productId, product.id)).orderBy(desc(reviews.createdAt)).limit(50),
    select(and(eq(products.subcategorySlug, product.subcategory), eq(products.categorySlug, product.category), ne(products.id, product.id)), sorters.popular, 4),
    select(and(eq(products.categorySlug, product.category), ne(products.subcategorySlug, product.subcategory)), sorters.popular, 4),
  ])
  const list: Array<Review> = productReviews.map((r) => ({
    productId: r.productId,
    author: r.author,
    city: r.city,
    rating: r.rating,
    date: r.createdAt.toISOString().slice(0, 10),
    title: r.title,
    body: r.body,
    verified: r.verified,
  }))
  return { product, reviews: list, related: [...sameSub, ...sameCategory].slice(0, 4) }
}

export const getProductsByIds = (ids: Array<number>) => (ids.length ? select(inArray(products.id, ids), [], ids.length) : Promise.resolve([]))

export async function getHome(categorySlugs: Array<string>) {
  const [featured, deals, bestSellers, newArrivals, ...byCategory] = await Promise.all([
    select(eq(products.featured, true), newest, 8),
    select(onSaleWhere, [desc(sql`(${products.compareAt} - ${products.price})::float / ${products.compareAt}`)], 4),
    select(gt(products.sold, 0), sorters.bestselling, 4),
    select(undefined, newest, 4),
    ...categorySlugs.map((slug) => select(eq(products.categorySlug, slug), sorters.popular, 4)),
  ])
  return { featured, deals, bestSellers, newArrivals, byCategory: categorySlugs.map((slug, i) => ({ slug, items: byCategory[i] })) }
}

export const getFeatured = (limit: number) => select(eq(products.featured, true), newest, limit)
