#!/usr/bin/env node
/**
 * Turns the supplier product export (CSV) into a seed SQL migration.
 *
 *   node scripts/build-catalog-seed.mjs data/products.csv netlify/database/migrations/<ts>_<name>/migration.sql
 *
 * Every product is cleaned up (mojibake, typos, wholesale noise in titles) and sorted
 * into a storefront category + subcategory ("collection") based on its CSV category and name.
 * Statements upsert by id, so the same script can produce follow-up import migrations.
 */
import { readFileSync, writeFileSync } from 'node:fs'

const [, , csvPath, outPath] = process.argv
if (!csvPath || !outPath) {
  console.error('Usage: node scripts/build-catalog-seed.mjs <products.csv> <migration.sql>')
  process.exit(1)
}

// ---- Storefront collections ----

const categories = [
  {
    slug: 'women',
    name: "Women's Unstitched",
    blurb: '3-piece embroidered, printed & plain suits',
    image: '/img/cat-women.png',
    csv: "Women's Unstitched",
    subcategories: [
      ['embroidered', 'Embroidered Suits'],
      ['digital-print', 'Digital Print Suits'],
      ['plain', 'Plain Suits'],
    ],
  },
  {
    slug: 'beauty',
    name: 'Beauty & Personal Care',
    blurb: 'Makeup, skincare, hair care & grooming',
    image: '/img/cat-beauty.png',
    csv: 'Cosmetics',
    subcategories: [
      ['makeup', 'Makeup'],
      ['skincare', 'Skincare'],
      ['haircare', 'Hair Care'],
      ['styling-tools', 'Hair Styling Tools'],
      ['grooming', 'Grooming & Shaving'],
      ['nail-care', 'Nail Care'],
      ['organizers', 'Makeup Organizers'],
    ],
  },
  {
    slug: 'shoes',
    name: 'Shoes',
    blurb: 'Heels, flats, slippers & casual wear',
    image: '/img/cat-accessories.png',
    csv: 'Shoes',
    subcategories: [
      ['women', "Women's Footwear"],
      ['men', "Men's Footwear"],
      ['winter-slippers', 'Warm & Home Slippers'],
      ['slides', 'Slides & Flip-Flops'],
      ['shoe-care', 'Insoles & Shoe Care'],
    ],
  },
  {
    slug: 'electronics',
    name: 'Electronic Accessories',
    blurb: 'Smartwatches, earbuds, chargers & more',
    image: '/img/cat-electronics.png',
    csv: 'Electronic Accessories',
    subcategories: [
      ['smartwatches', 'Smart Watches'],
      ['earbuds', 'Earbuds & Headphones'],
      ['speakers', 'Bluetooth Speakers'],
      ['chargers', 'Chargers & Power Banks'],
      ['cables', 'Charging Cables'],
      ['holders', 'Phone Holders & Stands'],
    ],
  },
  {
    slug: 'accessories',
    name: 'Fashion Accessories',
    blurb: 'Watches, sunglasses, wallets & caps',
    image: null, // filled with a watch photo below
    csv: 'Fashion Accessories',
    subcategories: [
      ['watches', 'Watches'],
      ['sunglasses', 'Sunglasses & Smart Glasses'],
      ['wallets', 'Wallets'],
      ['caps', 'Caps & Winter Wear'],
      ['hair', 'Hair Accessories'],
    ],
  },
  {
    slug: 'bags',
    name: 'Bags',
    blurb: 'Handbags, crossbody & laptop bags',
    image: null, // filled with a handbag photo below
    csv: 'Bags',
    subcategories: [
      ['handbags', 'Handbags & Shoulder Bags'],
      ['crossbody', 'Crossbody & Sling Bags'],
      ['laptop', 'Laptop Bags'],
    ],
  },
]

const has = (s, ...words) => words.some((w) => (w instanceof RegExp ? w.test(s) : s.includes(w)))

/** Picks the subcategory slug for a product. Order of checks matters. */
function classify(category, rawName) {
  const n = rawName.toLowerCase()
  switch (category) {
    case 'women':
      if (n.includes('digital print')) return 'digital-print'
      if (n.includes('plain')) return 'plain'
      return 'embroidered'
    case 'beauty':
      if (has(n, 'organizer', 'travel case', 'storage solution')) return 'organizers'
      if (has(n, 'nail', 'manicure', 'pedicure')) return 'nail-care'
      if (has(n, 'clipper', 'trimmer', 'shaver', 'shaving', 'after shave', 'aftershave', 'hair remover')) return 'grooming'
      if (has(n, 'crimper', 'waver', 'dryer', 'styling spray')) return 'styling-tools'
      if (has(n, 'hair', 'shampoo', 'scalp')) return 'haircare'
      if (has(n, 'lip', 'foundation', 'concealer', 'powder', 'eyeshadow', 'eyeliner', 'mascara', 'blush', 'highlighter', 'body oil')) return 'makeup'
      return 'skincare'
    case 'shoes':
      if (n.includes('insole')) return 'shoe-care'
      if (has(n, 'cotton', 'plush', 'fleece', 'furry', 'wool', 'winter')) return 'winter-slippers'
      if (has(n, 'eva', 'slide', 'flip-flop', 'beach', 'bathroom')) return 'slides'
      if (has(n, /^(stylish )?women's/, 'for women')) return 'women'
      return 'men'
    case 'electronics':
      if (has(n, 'smart watch', 'smartwatch')) return 'smartwatches'
      if (has(n, 'speaker')) return 'speakers'
      if (has(n, 'earbud', 'airpod', 'buds', 'handsfree', 'headphone', 'headset', 'earphone', 'neckband')) return 'earbuds'
      if (has(n, 'holder', 'stand', 'selfie')) return 'holders'
      if (has(n, 'cable') && !has(n, 'charger', 'adapter')) return 'cables'
      return 'chargers'
    case 'accessories':
      if (has(n, 'glasses')) return 'sunglasses'
      if (has(n, 'watch')) return 'watches'
      if (has(n, 'wallet')) return 'wallets'
      if (has(n, 'pakol', 'pakool', 'chitrali', 'cap', 'earmuff', 'gloves')) return 'caps'
      return 'hair'
    case 'bags':
      if (n.includes('laptop')) return 'laptop'
      if (has(n, 'crossbody', 'cross-body', 'sling')) return 'crossbody'
      return 'handbags'
  }
  throw new Error(`Unknown category ${category}`)
}

// ---- Product copy ----

const copy = {
  women: {
    embroidered: ['Unstitched 3-piece suit with an embroidered shirt, dupatta and trouser fabric — tailor it to your own fit and style.', ['Embroidered shirt fabric', '3 pieces: shirt, dupatta & trouser']],
    'digital-print': ['Unstitched 3-piece suit with a vibrant digitally printed shirt, dupatta and trouser fabric — ready for your tailor.', ['Digital print shirt fabric', '3 pieces: shirt, dupatta & trouser']],
    plain: ['Unstitched 3-piece plain suit — a clean, versatile base for everyday wear, tailored to your fit.', ['Plain dyed fabric', '3 pieces: shirt, dupatta & trouser']],
  },
  beauty: {
    makeup: ['Everyday makeup essential for a polished, long-lasting look.', ['Easy to apply', 'Travel friendly']],
    skincare: ['Skincare essential for your daily cleanse, care and glow routine.', ['Suitable for daily routines']],
    haircare: ['Hair care treatment to help keep your hair soft, smooth and manageable.', ['For regular hair care routines']],
    'styling-tools': ['Hair styling tool for salon-style results at home.', ['Salon-style results at home']],
    grooming: ['Grooming essential for a neat, well-kept look every day.', ['Everyday grooming']],
    'nail-care': ['Nail and foot care tools for at-home manicures and pedicures.', ['At-home manicure & pedicure']],
    organizers: ['Makeup organizer to keep your cosmetics tidy at home and on the go.', ['Keeps makeup organised', 'Easy to carry']],
  },
  shoes: {
    women: ["Stylish women's footwear for everyday wear, parties and festive occasions.", ['Comfortable fit']],
    men: ["Men's footwear built for daily comfort and a smart look.", ['Comfortable fit']],
    'winter-slippers': ['Warm, cushioned slippers for cosy winter days at home and quick trips outside.', ['Warm plush lining', 'Non-slip sole']],
    slides: ['Lightweight slides for home, the bathroom and casual outings.', ['Lightweight & easy to clean']],
    'shoe-care': ['Shoe insoles for extra cushioning and grip in your everyday shoes.', ['Extra cushioning']],
  },
  electronics: {
    smartwatches: ['Smartwatch for fitness tracking, notifications and everyday style.', ['Works with Android & iOS phones']],
    earbuds: ['Audio accessory for music, calls and everyday listening.', ['Clear sound for music & calls']],
    speakers: ['Portable Bluetooth speaker for music at home or on the go.', ['Wireless Bluetooth', 'Portable design']],
    chargers: ['Charging accessory to keep your phone and gadgets powered up — handy through load-shedding.', ['Reliable everyday charging']],
    cables: ['Charging cable for fast, reliable charging and data transfer.', ['Fast, reliable charging']],
    holders: ['Phone holder and stand for hands-free use at your desk, in the car or on the bike.', ['Hands-free viewing']],
  },
  accessories: {
    watches: ['Wrist watch that pairs well with both casual and formal outfits.', ['Smart everyday style']],
    sunglasses: ['Eyewear that protects your eyes and completes your look.', ['Everyday eye protection']],
    wallets: ['Wallet to keep your cards and cash neatly organised.', ['Card & cash slots']],
    caps: ['Traditional and winter headwear to keep you warm in style.', ['Warm & comfortable']],
    hair: ['Hair accessory for quick, comfortable everyday styling.', ['Gentle on hair']],
  },
  bags: {
    handbags: ['Elegant handbag with room for all your daily essentials.', ['Roomy main compartment']],
    crossbody: ['Hands-free crossbody bag for errands, travel and everyday outings.', ['Adjustable strap']],
    laptop: ['Laptop bag to carry your laptop and work essentials safely.', ['Laptop compartment']],
  },
}

const brands = ['BINBOND', 'CURREN', 'Kemei', 'Remington', 'Miss Rose', 'Karseell', 'Herbs Fusion', 'GEGEMOON', 'DALING', 'SIHEGLAN', 'Samsung', 'PureDerm', 'Sabalon', 'Oxford', 'Omega', 'Greatmic', 'GEMAN', 'FZ POWER', 'ROXIE', 'Zafrani', 'JOLLY', 'SAFEWAY', 'Centellian24', 'Oppo', 'AGRADE', 'EKG', 'M Power', 'Paul Valley']

const typos = [
  [/Â°/g, '°'],
  [/^\W*ð\S*\s*/u, ''],
  [/\)n$/, ')'],
  [/\(bf\)/gi, ''],
  [/Waterpoof/g, 'Waterproof'],
  [/Stainlesssteel/g, 'Stainless Steel'],
  [/Pretty Gril/g, 'Pretty Girl'],
  [/Jhonsons/g, "Johnson's"],
  [/^WLadies/, 'Ladies'],
  [/Rabit/g, 'Rabbit'],
  [/Pakool/g, 'Pakol'],
  [/Cera ve/g, 'CeraVe'],
  [/Miss rose/g, 'Miss Rose'],
  [/FlawLBSS/g, 'Flawless'],
  [/AndroidiOS/g, 'Android/iOS'],
  [/2-in1/g, '2-in-1'],
  [/ with a Stepping-On-Poop Feeling/g, ''],
  [/IPhone/g, 'iPhone'],
  [/Sunglasses Sunglasses/g, 'Sunglasses'],
  [/Smartwatch(?=\d)/g, 'Smartwatch '],
  [/SmartWatch(?=[A-Z])/g, 'Smart Watch '],
  [/(\d) PremiumStraps?/g, '$1 Premium Straps'],
  [/PremiumChangeable/g, 'Premium Changeable'],
  [/InterchangeBands/g, 'Interchangeable Bands'],
  [/ChangeableStraps/g, 'Changeable Straps'],
  [/StrapKit/g, 'Strap Kit'],
  [/StylishBands/g, 'Stylish Bands'],
  [/PremiumStrap/g, 'Premium Strap'],
  [/WatchUltra/g, 'Watch Ultra'],
  [/SeriesUltra/g, 'Series Ultra'],
  [/BluetoothSmart/g, 'Bluetooth Smart'],
  [/SmartwatchAlways/g, 'Smartwatch, Always'],
  [/7Belts/g, '7 Belts'],
  [/7Stylish/g, '7 Stylish'],
  [/7Pack/g, '7 Pack'],
  [/7In 1/gi, '7-in-1'],
  [/Ultra 3Smart/g, 'Ultra 3 Smart'],
  [/Smartwatch7/g, 'Smartwatch 7'],
  [/Watch7/g, 'Watch 7'],
  [/Ultra3/g, 'Ultra 3'],
  // Wholesale marketplace noise that means nothing to shoppers
  [/\b(Cross-Border|Cross-border|Internet-famous|Internet Popular)\s*/g, ''],
  [/,?\s*Wholesale( in Stock)?/g, ''],
  [/\s+for Export/g, ''],
  [/^(2024|2025|2026)\s+/, ''],
]

function cleanName(raw) {
  let s = raw
  for (const [re, to] of typos) s = s.replace(re, to)
  s = s.replace(/\s+/g, ' ').replace(/\s+,/g, ',').replace(/,\s*$/, '').trim()
  if (!/^i[A-Z]/.test(s)) s = s.charAt(0).toUpperCase() + s.slice(1)
  // Long marketplace titles: keep the first clause as the name, the full title goes in the description.
  if (s.length > 70) {
    const first = s.split(/,\s*/)[0]
    if (first.length >= 25 && first.length <= 70) return { name: first, full: s }
    const words = first.split(' ')
    let short = ''
    for (const w of words) {
      if ((short + ' ' + w).trim().length > 60) break
      short = (short + ' ' + w).trim()
    }
    short = short.replace(/\s+(and|for|with|to|a|the|in|of|&|or)$/i, '')
    return { name: short, full: s }
  }
  return { name: s, full: s }
}

const slugify = (s) =>
  s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70).replace(/-+$/, '')

// ---- CSV parsing (handles quoted fields) ----

function parseCsv(text) {
  const rows = []
  let row = [], field = '', quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') quoted = false
      else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field); field = ''
      if (row.some((f) => f !== '')) rows.push(row)
      row = []
    } else field += c
  }
  if (field || row.length) { row.push(field); rows.push(row) }
  const [header, ...body] = rows
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] ?? '').trim()])))
}

// ---- Build ----

const rows = parseCsv(readFileSync(csvPath, 'utf8').replace(/^﻿/, ''))
const byCsv = new Map(categories.map((c) => [c.csv, c]))
const problems = []
const items = []

for (const r of rows) {
  const category = byCsv.get(r.Category)
  const id = Number(r.ID)
  const price = Number(r.Price)
  const stock = Number(r.Stock)
  const images = r.Images.split('|').map((u) => u.trim()).filter((u) => /^https:\/\//.test(u))
  if (!category) { problems.push(`${r.ID}: unknown category "${r.Category}"`); continue }
  if (!Number.isInteger(id) || !Number.isInteger(price) || price <= 0) { problems.push(`${r.ID}: bad id/price`); continue }
  if (!images.length) { problems.push(`${r.ID}: no images`); continue }

  const { name, full } = cleanName(r.Name)
  const sub = classify(category.slug, r.Name)
  const subName = category.subcategories.find(([s]) => s === sub)[1]
  const [short, extra] = copy[category.slug][sub]
  const brand = brands.find((b) => r.Name.toLowerCase().includes(b.toLowerCase())) ?? null
  const specs = { Collection: `${category.name} › ${subName}`, SKU: `NB-${id}` }
  if (brand) specs.Brand = brand
  if (category.slug === 'women') specs.Pieces = '3 (shirt, dupatta, trouser)'
  specs.Condition = 'Brand new'

  items.push({
    id,
    slug: `${slugify(name)}-${id}`,
    name,
    brand,
    category: category.slug,
    sub,
    price,
    stock: Number.isInteger(stock) && stock > 0 ? stock : 0,
    supplierCode: r['Supplier Code'] || null,
    shortDescription: short,
    description: `${full}. ${short} Order online and pay Cash on Delivery anywhere in Pakistan, with free delivery on orders over Rs. 3,000 and 7-day easy returns.`,
    highlights: [...extra, 'Cash on Delivery across Pakistan', '7-day easy returns'],
    specs,
    createdAt: r['Created At'] || new Date().toISOString(),
    images,
  })
}

if (problems.length) {
  console.error(`Skipped ${problems.length} rows:\n  ${problems.join('\n  ')}`)
}

// Feature the two best-photographed products of each category on the homepage.
for (const c of categories) {
  items
    .filter((p) => p.category === c.slug)
    .sort((a, b) => b.images.length - a.images.length || b.id - a.id)
    .slice(0, 2)
    .forEach((p) => (p.featured = true))
}

// Categories without a studio image use one of their own product photos.
const coverFor = { accessories: 'watches', bags: 'handbags' }
for (const c of categories) {
  if (!c.image) c.image = items.find((p) => p.category === c.slug && p.sub === coverFor[c.slug] && p.images.length > 1)?.images[0] ?? items.find((p) => p.category === c.slug).images[0]
}

// ---- SQL ----

const q = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' || typeof v === 'boolean' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
const j = (v) => `${q(JSON.stringify(v))}::jsonb`

const out = []
out.push(`-- Generated by scripts/build-catalog-seed.mjs from ${csvPath} (${items.length} products). Do not edit by hand.`)
out.push('-- Remove the Milestone 1 demo catalog (ids 1–12) if it was ever loaded.')
out.push('DELETE FROM products WHERE id BETWEEN 1 AND 12;')

out.push(
  `INSERT INTO categories (slug, name, blurb, image, position) VALUES\n${categories
    .map((c, i) => `  (${q(c.slug)}, ${q(c.name)}, ${q(c.blurb)}, ${q(c.image)}, ${i})`)
    .join(',\n')}\nON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, blurb = EXCLUDED.blurb, image = EXCLUDED.image, position = EXCLUDED.position;`,
)
out.push(
  `INSERT INTO subcategories (category_slug, slug, name, position) VALUES\n${categories
    .flatMap((c) => c.subcategories.map(([s, n], i) => `  (${q(c.slug)}, ${q(s)}, ${q(n)}, ${i})`))
    .join(',\n')}\nON CONFLICT (category_slug, slug) DO UPDATE SET name = EXCLUDED.name, position = EXCLUDED.position;`,
)

for (let i = 0; i < items.length; i += 50) {
  const chunk = items.slice(i, i + 50)
  out.push(
    `INSERT INTO products (id, slug, name, brand, category_slug, subcategory_slug, price, stock, supplier_code, featured, short_description, description, highlights, specs, created_at) VALUES\n${chunk
      .map(
        (p) =>
          `  (${p.id}, ${q(p.slug)}, ${q(p.name)}, ${q(p.brand)}, ${q(p.category)}, ${q(p.sub)}, ${p.price}, ${p.stock}, ${q(p.supplierCode)}, ${!!p.featured}, ${q(p.shortDescription)}, ${q(p.description)}, ${j(p.highlights)}, ${j(p.specs)}, ${q(p.createdAt)})`,
      )
      .join(',\n')}\nON CONFLICT (id) DO UPDATE SET slug = EXCLUDED.slug, name = EXCLUDED.name, brand = EXCLUDED.brand, category_slug = EXCLUDED.category_slug, subcategory_slug = EXCLUDED.subcategory_slug, price = EXCLUDED.price, stock = EXCLUDED.stock, supplier_code = EXCLUDED.supplier_code, featured = EXCLUDED.featured, short_description = EXCLUDED.short_description, description = EXCLUDED.description, highlights = EXCLUDED.highlights, specs = EXCLUDED.specs, created_at = EXCLUDED.created_at;`,
  )
}

const ids = items.map((p) => p.id).join(', ')
out.push(`DELETE FROM product_images WHERE product_id IN (${ids});`)
const imageRows = items.flatMap((p) => p.images.map((url, pos) => `  (${p.id}, ${q(url)}, ${pos})`))
for (let i = 0; i < imageRows.length; i += 200) {
  out.push(`INSERT INTO product_images (product_id, url, position) VALUES\n${imageRows.slice(i, i + 200).join(',\n')};`)
}

out.push(`INSERT INTO coupons (code, description, type, value, min_subtotal) VALUES
  ('WELCOME10', '10% off orders over Rs. 2,000', 'percent', 10, 2000),
  ('FLAT500', 'Rs. 500 off orders over Rs. 5,000', 'flat', 500, 5000)
ON CONFLICT (code) DO NOTHING;`)

writeFileSync(outPath, out.join('\n\n') + '\n')

const summary = {}
for (const p of items) summary[`${p.category}/${p.sub}`] = (summary[`${p.category}/${p.sub}`] ?? 0) + 1
console.log(`Wrote ${items.length} products, ${imageRows.length} images to ${outPath}`)
console.table(summary)
if (process.env.VERBOSE) for (const p of items) console.log(`${p.category}/${p.sub}\t${p.name}`)
