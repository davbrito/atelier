-- Enforce quotation immutability at the database level with row-level
-- security. The app connects as the table owner, so FORCE is required for
-- the policies to apply to it. Policies exist only for the operations the
-- app legitimately performs: without an UPDATE policy (and without DELETE
-- on the line tables) those statements match zero rows for everyone.
--
-- Referential-integrity actions bypass RLS by design, so the intended
-- cascades keep working: deleting a quotation still removes its lines, and
-- deleting a catalog material/operation still sets the line reference to
-- NULL without touching the frozen data.
--
-- NOTE for future migrations: a data-fix UPDATE against these tables will
-- silently affect zero rows. Temporarily run
--   ALTER TABLE <t> NO FORCE ROW LEVEL SECURITY;
-- before the fix and restore FORCE afterwards.
ALTER TABLE "quotations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "quotations" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "quotations_select" ON "quotations" FOR SELECT USING (true);--> statement-breakpoint
CREATE POLICY "quotations_insert" ON "quotations" FOR INSERT WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "quotations_delete" ON "quotations" FOR DELETE USING (true);--> statement-breakpoint
ALTER TABLE "quotation_materials" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "quotation_materials" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "quotation_materials_select" ON "quotation_materials" FOR SELECT USING (true);--> statement-breakpoint
CREATE POLICY "quotation_materials_insert" ON "quotation_materials" FOR INSERT WITH CHECK (true);--> statement-breakpoint
ALTER TABLE "quotation_operations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "quotation_operations" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "quotation_operations_select" ON "quotation_operations" FOR SELECT USING (true);--> statement-breakpoint
CREATE POLICY "quotation_operations_insert" ON "quotation_operations" FOR INSERT WITH CHECK (true);
