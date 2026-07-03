CREATE TYPE "inventory_movement_type" AS ENUM('entry', 'exit', 'adjustment');--> statement-breakpoint
CREATE TABLE "material_inventory_movements" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"material_id" uuid NOT NULL,
	"organization_id" text NOT NULL,
	"type" "inventory_movement_type" NOT NULL,
	"delta" numeric(12,4) NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by_id" text
);
--> statement-breakpoint
ALTER TABLE "material_inventory_movements" ADD CONSTRAINT "material_inventory_movements_material_id_materials_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "material_inventory_movements" ADD CONSTRAINT "material_inventory_movements_SWQ7tAplfrG7_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "material_inventory_movements" ADD CONSTRAINT "material_inventory_movements_created_by_id_user_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL;