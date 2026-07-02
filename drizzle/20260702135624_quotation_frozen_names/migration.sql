ALTER TABLE "quotation_materials" ADD COLUMN "frozen_name" varchar(255);--> statement-breakpoint
UPDATE "quotation_materials" SET "frozen_name" = COALESCE((SELECT m."name" FROM "materials" m WHERE m."id" = "quotation_materials"."material_id"), 'Material');--> statement-breakpoint
ALTER TABLE "quotation_materials" ALTER COLUMN "frozen_name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "quotation_operations" ADD COLUMN "frozen_name" varchar(255);--> statement-breakpoint
UPDATE "quotation_operations" SET "frozen_name" = COALESCE((SELECT o."name" FROM "operations" o WHERE o."id" = "quotation_operations"."operation_id"), 'Operación');--> statement-breakpoint
ALTER TABLE "quotation_operations" ALTER COLUMN "frozen_name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "quotation_materials" ALTER COLUMN "material_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "quotation_operations" ALTER COLUMN "operation_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "quotation_materials" DROP CONSTRAINT "quotation_materials_material_id_materials_id_fkey", ADD CONSTRAINT "quotation_materials_material_id_materials_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "quotation_operations" DROP CONSTRAINT "quotation_operations_operation_id_operations_id_fkey", ADD CONSTRAINT "quotation_operations_operation_id_operations_id_fkey" FOREIGN KEY ("operation_id") REFERENCES "operations"("id") ON DELETE SET NULL;
