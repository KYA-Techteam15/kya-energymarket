CREATE TABLE "edition_features" (
	"edition_id" uuid NOT NULL,
	"feature_id" uuid NOT NULL,
	CONSTRAINT "edition_features_edition_id_feature_id_pk" PRIMARY KEY("edition_id","feature_id")
);
--> statement-breakpoint
CREATE TABLE "editions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" jsonb NOT NULL,
	"audience" jsonb NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"watermark" jsonb,
	"grace_days" integer DEFAULT 0 NOT NULL,
	"max_seats" integer,
	"max_projects" integer,
	"active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"edition_id" uuid NOT NULL,
	"duration" text NOT NULL,
	"price_per_seat" integer NOT NULL,
	"indicative" boolean DEFAULT true NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_features" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"key" text NOT NULL,
	"label" jsonb NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'hidden' NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"kind" jsonb NOT NULL,
	"summary" jsonb NOT NULL,
	"logo" text,
	"monogram" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"storage_key" text,
	"path" text,
	"mime" text NOT NULL,
	"width" integer,
	"height" integer,
	"bytes" integer,
	"alt" jsonb NOT NULL,
	"credit" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text
);
--> statement-breakpoint
CREATE TABLE "page_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"version" integer NOT NULL,
	"status" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"blocks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	"published_by" text
);
--> statement-breakpoint
CREATE TABLE "pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid,
	"key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "edition_features" ADD CONSTRAINT "edition_features_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edition_features" ADD CONSTRAINT "edition_features_feature_id_product_features_id_fk" FOREIGN KEY ("feature_id") REFERENCES "public"."product_features"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editions" ADD CONSTRAINT "editions_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plans" ADD CONSTRAINT "plans_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_features" ADD CONSTRAINT "product_features_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_versions" ADD CONSTRAINT "page_versions_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "editions_code_idx" ON "editions" USING btree ("product_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "plans_duration_idx" ON "plans" USING btree ("edition_id","duration");--> statement-breakpoint
CREATE INDEX "plans_edition_idx" ON "plans" USING btree ("edition_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_features_key_idx" ON "product_features" USING btree ("product_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "products_slug_idx" ON "products" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "media_storage_key_idx" ON "media" USING btree ("storage_key");--> statement-breakpoint
CREATE UNIQUE INDEX "media_path_idx" ON "media" USING btree ("path");--> statement-breakpoint
CREATE UNIQUE INDEX "page_versions_number_idx" ON "page_versions" USING btree ("page_id","locale","version");--> statement-breakpoint
CREATE UNIQUE INDEX "page_versions_draft_idx" ON "page_versions" USING btree ("page_id","locale") WHERE "page_versions"."status" = 'draft';--> statement-breakpoint
CREATE UNIQUE INDEX "page_versions_published_idx" ON "page_versions" USING btree ("page_id","locale") WHERE "page_versions"."status" = 'published';--> statement-breakpoint
CREATE INDEX "page_versions_page_idx" ON "page_versions" USING btree ("page_id","locale");--> statement-breakpoint
CREATE UNIQUE INDEX "pages_product_key_idx" ON "pages" USING btree ("product_id","key") WHERE "pages"."product_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "pages_market_key_idx" ON "pages" USING btree ("key") WHERE "pages"."product_id" is null;