CREATE TABLE "order_payments" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"organization_id" text NOT NULL,
	"order_id" uuid NOT NULL,
	"method" varchar(50) NOT NULL,
	"amount" numeric(12,2) NOT NULL,
	"reference" varchar(100),
	"image" text,
	"notes" text,
	"paid_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "deposit_amount";--> statement-breakpoint
CREATE INDEX "order_payments_order_id_idx" ON "order_payments" ("order_id");--> statement-breakpoint
CREATE INDEX "order_payments_organization_id_idx" ON "order_payments" ("organization_id");--> statement-breakpoint
ALTER TABLE "order_payments" ADD CONSTRAINT "order_payments_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "order_payments" ADD CONSTRAINT "order_payments_order_id_orders_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE;