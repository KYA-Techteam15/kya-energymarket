CREATE TABLE "catalog_drafts" (
	"product_id" uuid PRIMARY KEY NOT NULL,
	"document" jsonb NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "license_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"edition_id" uuid NOT NULL,
	"name" jsonb NOT NULL,
	"nature" text DEFAULT 'sale' NOT NULL,
	"days" integer NOT NULL,
	"price_per_seat" integer NOT NULL,
	"indicative" boolean DEFAULT true NOT NULL,
	"seats_min" integer DEFAULT 1 NOT NULL,
	"seats_max" integer,
	"renewable" boolean DEFAULT true NOT NULL,
	"visible" boolean DEFAULT false NOT NULL,
	"for_sale" boolean DEFAULT false NOT NULL,
	"archived_at" timestamp with time zone,
	"sort" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 5 NOT NULL,
	"run_at" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_at" timestamp with time zone,
	"last_error" text,
	"reference" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "license_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"license_type_id" uuid NOT NULL,
	"label" text NOT NULL,
	"reason" text NOT NULL,
	"mode" text NOT NULL,
	"seats" integer NOT NULL,
	"count" integer NOT NULL,
	"customer_name" text NOT NULL,
	"organization_id" text,
	"starts_on_activation" boolean DEFAULT true NOT NULL,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text
);
--> statement-breakpoint
ALTER TABLE "licenses" ALTER COLUMN "organization_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "licenses" ALTER COLUMN "starts_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "licenses" ALTER COLUMN "expires_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "editions" ADD COLUMN "software_edition" text;--> statement-breakpoint
ALTER TABLE "editions" ADD COLUMN "highlights" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "editions" ADD COLUMN "visible" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "editions" ADD COLUMN "for_sale" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "editions" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "software_editions" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "catalog_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "licenses" ADD COLUMN "license_type_id" uuid;--> statement-breakpoint
ALTER TABLE "licenses" ADD COLUMN "type_name" jsonb;--> statement-breakpoint
ALTER TABLE "licenses" ADD COLUMN "nature" text;--> statement-breakpoint
ALTER TABLE "licenses" ADD COLUMN "days" integer;--> statement-breakpoint
ALTER TABLE "licenses" ADD COLUMN "price_per_seat" integer;--> statement-breakpoint
ALTER TABLE "licenses" ADD COLUMN "amount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "licenses" ADD COLUMN "channel" text;--> statement-breakpoint
ALTER TABLE "licenses" ADD COLUMN "reason" text;--> statement-breakpoint
ALTER TABLE "licenses" ADD COLUMN "reference" text;--> statement-breakpoint
ALTER TABLE "licenses" ADD COLUMN "batch_id" uuid;--> statement-breakpoint
ALTER TABLE "licenses" ADD COLUMN "recipient_email" text;--> statement-breakpoint
ALTER TABLE "licenses" ADD COLUMN "starts_on_activation" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "licenses" ADD COLUMN "idempotency_key" text;--> statement-breakpoint
ALTER TABLE "catalog_drafts" ADD CONSTRAINT "catalog_drafts_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "license_types" ADD CONSTRAINT "license_types_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "license_batches" ADD CONSTRAINT "license_batches_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "license_batches" ADD CONSTRAINT "license_batches_license_type_id_license_types_id_fk" FOREIGN KEY ("license_type_id") REFERENCES "public"."license_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "license_batches" ADD CONSTRAINT "license_batches_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "license_types_edition_idx" ON "license_types" USING btree ("edition_id");--> statement-breakpoint
CREATE INDEX "jobs_due_idx" ON "jobs" USING btree ("status","run_at");--> statement-breakpoint
CREATE INDEX "jobs_reference_idx" ON "jobs" USING btree ("reference");--> statement-breakpoint
CREATE UNIQUE INDEX "license_batches_idempotency_idx" ON "license_batches" USING btree ("idempotency_key");--> statement-breakpoint
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_license_type_id_license_types_id_fk" FOREIGN KEY ("license_type_id") REFERENCES "public"."license_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_batch_id_license_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."license_batches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "licenses_batch_idx" ON "licenses" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "licenses_recipient_idx" ON "licenses" USING btree ("recipient_email");--> statement-breakpoint
CREATE UNIQUE INDEX "licenses_idempotency_idx" ON "licenses" USING btree ("idempotency_key");--> statement-breakpoint
-- Reprise des données (spec 005b, FR-012) : les éditions actives restent visibles et en vente, les
-- durées deviennent des types de licence (même identifiant), les licences reçoivent leur type, leur
-- copie figée et leur canal.
UPDATE "editions" SET "software_edition" = "code", "visible" = "active", "for_sale" = "active";--> statement-breakpoint
UPDATE "products" SET "software_editions" = '["commercial","academic","student"]'::jsonb WHERE "slug" = 'kya-soldesign';--> statement-breakpoint
INSERT INTO "license_types" ("id", "edition_id", "name", "nature", "days", "price_per_seat", "indicative", "seats_min", "renewable", "visible", "for_sale", "sort", "updated_at")
SELECT "p"."id", "p"."edition_id",
  CASE "p"."duration"
    WHEN 'P1D' THEN '{"fr":"1 jour","en":"1 day"}'::jsonb
    WHEN 'P1W' THEN '{"fr":"1 semaine","en":"1 week"}'::jsonb
    WHEN 'P1M' THEN '{"fr":"1 mois","en":"1 month"}'::jsonb
    WHEN 'P3M' THEN '{"fr":"1 trimestre","en":"3 months"}'::jsonb
    WHEN 'P6M' THEN '{"fr":"6 mois","en":"6 months"}'::jsonb
    ELSE '{"fr":"1 an","en":"1 year"}'::jsonb
  END,
  'sale',
  CASE "p"."duration" WHEN 'P1D' THEN 1 WHEN 'P1W' THEN 7 WHEN 'P1M' THEN 30 WHEN 'P3M' THEN 91 WHEN 'P6M' THEN 182 ELSE 365 END,
  "p"."price_per_seat", "p"."indicative", 1, true, "p"."active", "p"."active", "p"."sort", "p"."updated_at"
FROM "plans" "p";--> statement-breakpoint
UPDATE "licenses" "l" SET "license_type_id" = "t"."id", "type_name" = "t"."name", "price_per_seat" = "t"."price_per_seat"
FROM "plans" "p" JOIN "license_types" "t" ON "t"."id" = "p"."id"
WHERE "p"."edition_id" = "l"."edition_id" AND "p"."duration" = "l"."duration";--> statement-breakpoint
UPDATE "licenses" SET
  "days" = CASE "duration" WHEN 'P1D' THEN 1 WHEN 'P1W' THEN 7 WHEN 'P1M' THEN 30 WHEN 'P3M' THEN 91 WHEN 'P6M' THEN 182 ELSE 365 END,
  "type_name" = COALESCE("type_name", CASE "duration"
    WHEN 'P1D' THEN '{"fr":"1 jour","en":"1 day"}'::jsonb
    WHEN 'P1W' THEN '{"fr":"1 semaine","en":"1 week"}'::jsonb
    WHEN 'P1M' THEN '{"fr":"1 mois","en":"1 month"}'::jsonb
    WHEN 'P3M' THEN '{"fr":"1 trimestre","en":"3 months"}'::jsonb
    WHEN 'P6M' THEN '{"fr":"6 mois","en":"6 months"}'::jsonb
    ELSE '{"fr":"1 an","en":"1 year"}'::jsonb
  END),
  "price_per_seat" = COALESCE("price_per_seat", 0),
  "channel" = CASE "source" WHEN 'purchase' THEN 'purchase' WHEN 'trial' THEN 'trial' ELSE 'staff' END,
  "nature" = CASE "source" WHEN 'trial' THEN 'trial' ELSE 'sale' END;
