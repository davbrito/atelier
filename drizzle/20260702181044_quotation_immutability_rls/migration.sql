ALTER TABLE "quotations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "quotation_materials" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "quotation_operations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "quotations_select" ON "quotations" AS PERMISSIVE FOR SELECT TO public USING (true);--> statement-breakpoint
CREATE POLICY "quotations_insert" ON "quotations" AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "quotations_delete" ON "quotations" AS PERMISSIVE FOR DELETE TO public USING (true);--> statement-breakpoint
CREATE POLICY "quotation_materials_select" ON "quotation_materials" AS PERMISSIVE FOR SELECT TO public USING (true);--> statement-breakpoint
CREATE POLICY "quotation_materials_insert" ON "quotation_materials" AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "quotation_operations_select" ON "quotation_operations" AS PERMISSIVE FOR SELECT TO public USING (true);--> statement-breakpoint
CREATE POLICY "quotation_operations_insert" ON "quotation_operations" AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);--> statement-breakpoint
-- The ENABLE/CREATE POLICY statements above are generated from the pgPolicy
-- definitions in src/db/schema.ts. drizzle-kit does not emit FORCE ROW LEVEL
-- SECURITY, which is required here because the app connects as the table
-- owner (owners bypass plain RLS). These statements are appended by hand.
--
-- NOTE for future data-fix migrations: with FORCE active an UPDATE against
-- these tables affects 0 rows silently. Run `ALTER TABLE <t> NO FORCE ROW
-- LEVEL SECURITY;` before the fix and restore FORCE afterwards.
ALTER TABLE "quotations" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "quotation_materials" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "quotation_operations" FORCE ROW LEVEL SECURITY;