ALTER TABLE "quotations" DROP CONSTRAINT "quotations_budget_id_budgets_id_fkey";--> statement-breakpoint
ALTER TABLE "quotation_materials" DROP CONSTRAINT "quotation_materials_quotation_id_quotations_id_fkey";--> statement-breakpoint
ALTER TABLE "quotation_operations" DROP CONSTRAINT "quotation_operations_quotation_id_quotations_id_fkey";--> statement-breakpoint
ALTER TABLE "quotations" DROP COLUMN "budget_id";--> statement-breakpoint
ALTER TABLE "quotation_materials" DROP COLUMN "quotation_id";--> statement-breakpoint
ALTER TABLE "quotation_operations" DROP COLUMN "quotation_id";--> statement-breakpoint
ALTER TABLE "quotation_materials" ALTER COLUMN "quotation_line_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "quotation_operations" ALTER COLUMN "quotation_line_id" SET NOT NULL;--> statement-breakpoint
-- drizzle-kit never emits FORCE ROW LEVEL SECURITY (see 20260702181552); the
-- expansion migration deliberately left it off quotation_lines until the
-- backfill was verified safe. Match the immutability guarantee of its
-- siblings (quotations, quotation_materials, quotation_operations) now.
ALTER TABLE "quotation_lines" FORCE ROW LEVEL SECURITY;