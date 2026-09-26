CREATE TABLE "trial_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"product_id" uuid NOT NULL,
	"license_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "trial_license_type_id" uuid;--> statement-breakpoint
ALTER TABLE "trial_grants" ADD CONSTRAINT "trial_grants_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trial_grants" ADD CONSTRAINT "trial_grants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trial_grants" ADD CONSTRAINT "trial_grants_license_id_licenses_id_fk" FOREIGN KEY ("license_id") REFERENCES "public"."licenses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "trial_grants_user_product_idx" ON "trial_grants" USING btree ("user_id","product_id");--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_trial_license_type_id_license_types_id_fk" FOREIGN KEY ("trial_license_type_id") REFERENCES "public"."license_types"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- Essai de KYA-SolDesign (spec 006, FR-001) : « Essai 14 jours » de l'édition Commerciale, masqué et
-- hors vente, choisi comme essai du logiciel. Sans effet sur une base vide (l'amorçage s'en charge).
INSERT INTO "license_types" ("edition_id", "name", "nature", "days", "price_per_seat", "indicative", "seats_min", "seats_max", "renewable", "visible", "for_sale", "sort")
SELECT "e"."id", '{"fr":"Essai 14 jours","en":"14-day trial"}'::jsonb, 'trial', 14, 0, false, 1, 1, false, false, false, 99
FROM "editions" "e" JOIN "products" "p" ON "p"."id" = "e"."product_id"
WHERE "p"."slug" = 'kya-soldesign' AND "e"."code" = 'commercial'
  AND NOT EXISTS (SELECT 1 FROM "license_types" "t" WHERE "t"."edition_id" = "e"."id" AND "t"."nature" = 'trial');--> statement-breakpoint
UPDATE "products" SET "trial_license_type_id" = (
  SELECT "t"."id" FROM "license_types" "t" JOIN "editions" "e" ON "e"."id" = "t"."edition_id"
  WHERE "e"."product_id" = "products"."id" AND "e"."code" = 'commercial' AND "t"."nature" = 'trial'
  ORDER BY "t"."created_at" LIMIT 1
) WHERE "slug" = 'kya-soldesign' AND "trial_license_type_id" IS NULL;
