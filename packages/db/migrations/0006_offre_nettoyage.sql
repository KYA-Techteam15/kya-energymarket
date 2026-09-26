ALTER TABLE "plans" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "plans" CASCADE;--> statement-breakpoint
ALTER TABLE "editions" ALTER COLUMN "software_edition" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "licenses" ALTER COLUMN "type_name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "licenses" ALTER COLUMN "nature" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "licenses" ALTER COLUMN "days" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "licenses" ALTER COLUMN "price_per_seat" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "licenses" ALTER COLUMN "channel" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "editions" DROP COLUMN "active";--> statement-breakpoint
ALTER TABLE "licenses" DROP COLUMN "duration";--> statement-breakpoint
ALTER TABLE "licenses" DROP COLUMN "source";