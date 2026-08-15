CREATE TYPE "order_priority" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "order_status" AS ENUM('pending', 'in_progress', 'ready', 'delivered', 'cancelled');--> statement-breakpoint
CREATE TABLE "order_garments" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"order_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"stage_id" uuid,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" numeric(12,2) DEFAULT '0.00' NOT NULL,
	"fitting_date" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_garment_stages" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"organization_id" text NOT NULL,
	"name" varchar(100) NOT NULL,
	"color" varchar(20),
	"position" integer DEFAULT 0 NOT NULL,
	"is_system_default" boolean DEFAULT false NOT NULL,
	"is_final_stage" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"organization_id" text NOT NULL,
	"client_id" uuid,
	"quotation_id" uuid,
	"code" varchar(50) NOT NULL,
	"status" "order_status" DEFAULT 'pending'::"order_status" NOT NULL,
	"priority" "order_priority" DEFAULT 'medium'::"order_priority" NOT NULL,
	"total_amount" numeric(12,2) DEFAULT '0.00' NOT NULL,
	"deposit_amount" numeric(12,2) DEFAULT '0.00' NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"due_date" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "order_garments_order_id_idx" ON "order_garments" ("order_id");--> statement-breakpoint
CREATE INDEX "order_garments_stage_id_idx" ON "order_garments" ("stage_id");--> statement-breakpoint
CREATE INDEX "order_garment_stages_org_position_idx" ON "order_garment_stages" ("organization_id","position");--> statement-breakpoint
CREATE INDEX "orders_organization_id_idx" ON "orders" ("organization_id");--> statement-breakpoint
CREATE INDEX "orders_client_id_idx" ON "orders" ("client_id");--> statement-breakpoint
CREATE INDEX "orders_due_date_idx" ON "orders" ("due_date");--> statement-breakpoint
CREATE INDEX "orders_received_at_idx" ON "orders" ("received_at" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "order_garments" ADD CONSTRAINT "order_garments_order_id_orders_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "order_garments" ADD CONSTRAINT "order_garments_stage_id_order_garment_stages_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "order_garment_stages"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "order_garment_stages" ADD CONSTRAINT "order_garment_stages_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_client_id_clients_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_quotation_id_quotations_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE SET NULL;