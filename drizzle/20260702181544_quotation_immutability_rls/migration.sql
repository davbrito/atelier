ALTER TABLE "quotations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "quotation_materials" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "quotation_operations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "quotations_select" ON "quotations" AS PERMISSIVE FOR SELECT TO public USING (true);--> statement-breakpoint
CREATE POLICY "quotations_insert" ON "quotations" AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "quotations_delete" ON "quotations" AS PERMISSIVE FOR DELETE TO public USING (true);--> statement-breakpoint
CREATE POLICY "quotation_materials_select" ON "quotation_materials" AS PERMISSIVE FOR SELECT TO public USING (true);--> statement-breakpoint
CREATE POLICY "quotation_materials_insert" ON "quotation_materials" AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "quotation_operations_select" ON "quotation_operations" AS PERMISSIVE FOR SELECT TO public USING (true);--> statement-breakpoint
CREATE POLICY "quotation_operations_insert" ON "quotation_operations" AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);