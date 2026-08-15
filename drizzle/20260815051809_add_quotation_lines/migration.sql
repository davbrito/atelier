CREATE TABLE "quotation_lines" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"quotation_id" uuid NOT NULL,
	"budget_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "quotation_lines" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "order_garments" ADD COLUMN "budget_id" uuid;--> statement-breakpoint
ALTER TABLE "order_garments" ADD COLUMN "quotation_line_id" uuid;--> statement-breakpoint
ALTER TABLE "quotation_materials" ADD COLUMN "quotation_line_id" uuid;--> statement-breakpoint
ALTER TABLE "quotation_operations" ADD COLUMN "quotation_line_id" uuid;--> statement-breakpoint
ALTER TABLE "order_garments" ADD CONSTRAINT "order_garments_budget_id_budgets_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "budgets"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "order_garments" ADD CONSTRAINT "order_garments_quotation_line_id_quotation_lines_id_fkey" FOREIGN KEY ("quotation_line_id") REFERENCES "quotation_lines"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "quotation_lines" ADD CONSTRAINT "quotation_lines_quotation_id_quotations_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "quotation_lines" ADD CONSTRAINT "quotation_lines_budget_id_budgets_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "budgets"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "quotation_materials" ADD CONSTRAINT "quotation_materials_quotation_line_id_quotation_lines_id_fkey" FOREIGN KEY ("quotation_line_id") REFERENCES "quotation_lines"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "quotation_operations" ADD CONSTRAINT "quotation_operations_quotation_line_id_quotation_lines_id_fkey" FOREIGN KEY ("quotation_line_id") REFERENCES "quotation_lines"("id") ON DELETE CASCADE;--> statement-breakpoint
CREATE POLICY "quotation_lines_select" ON "quotation_lines" AS PERMISSIVE FOR SELECT TO public USING (true);--> statement-breakpoint
CREATE POLICY "quotation_lines_insert" ON "quotation_lines" AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);