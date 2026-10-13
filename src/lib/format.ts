const pkr = new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 })

/** Formats a rupee amount as "Rs. 1,999". */
export const formatPKR = (amount: number) => `Rs. ${pkr.format(Math.round(amount))}`

export const discountPercent = (price: number, compareAt?: number) =>
  compareAt && compareAt > price ? Math.round(((compareAt - price) / compareAt) * 100) : 0

/** Builds a Netlify Image CDN URL so pages never ship full-resolution originals. */
export function img(
  src: string,
  w: number,
  opts: { h?: number; fit?: 'cover' | 'contain'; position?: string; q?: number } = {},
) {
  const params = new URLSearchParams({ url: src, w: String(w), fm: 'webp' })
  if (opts.h) params.set('h', String(opts.h))
  if (opts.fit) params.set('fit', opts.fit)
  if (opts.position) params.set('position', opts.position)
  if (opts.q) params.set('q', String(opts.q))
  return `/.netlify/images?${params.toString()}`
}

export const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ')
