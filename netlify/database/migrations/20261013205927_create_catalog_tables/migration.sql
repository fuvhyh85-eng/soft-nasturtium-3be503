CREATE TABLE "categories" (
	"slug" text PRIMARY KEY,
	"name" text NOT NULL,
	"blurb" text DEFAULT '' NOT NULL,
	"image" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coupons" (
	"code" text PRIMARY KEY,
	"description" text NOT NULL,
	"type" text NOT NULL,
	"value" integer NOT NULL,
	"min_subtotal" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_images" (
	"id" serial PRIMARY KEY,
	"product_id" bigint NOT NULL,
	"url" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "product_images_product_position" UNIQUE("product_id","position")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" bigint PRIMARY KEY,
	"slug" text NOT NULL UNIQUE,
	"name" text NOT NULL,
	"brand" text,
	"category_slug" text NOT NULL,
	"subcategory_slug" text NOT NULL,
	"price" integer NOT NULL,
	"compare_at" integer,
	"rating" real DEFAULT 0 NOT NULL,
	"review_count" integer DEFAULT 0 NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	"sold" integer DEFAULT 0 NOT NULL,
	"supplier_code" text UNIQUE,
	"featured" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"short_description" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"highlights" jsonb DEFAULT '[]' NOT NULL,
	"specs" jsonb DEFAULT '{}' NOT NULL,
	"variants" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" serial PRIMARY KEY,
	"product_id" bigint NOT NULL,
	"author" text NOT NULL,
	"city" text DEFAULT '' NOT NULL,
	"rating" integer NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subcategories" (
	"category_slug" text,
	"slug" text,
	"name" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "subcategories_pkey" PRIMARY KEY("category_slug","slug")
);
--> statement-breakpoint
CREATE INDEX "products_category_idx" ON "products" ("category_slug","subcategory_slug");--> statement-breakpoint
CREATE INDEX "products_price_idx" ON "products" ("price");--> statement-breakpoint
CREATE INDEX "reviews_product_idx" ON "reviews" ("product_id");--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_products_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_slug_categories_slug_fkey" FOREIGN KEY ("category_slug") REFERENCES "categories"("slug");--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_product_id_products_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "subcategories" ADD CONSTRAINT "subcategories_category_slug_categories_slug_fkey" FOREIGN KEY ("category_slug") REFERENCES "categories"("slug") ON DELETE CASCADE;