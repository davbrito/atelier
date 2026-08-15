CREATE TABLE "code_counters" (
	"organization_id" text,
	"prefix" varchar(40),
	"last_value" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "code_counters_pkey" PRIMARY KEY("organization_id","prefix")
);
--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_organization_id_code_unique" UNIQUE("organization_id","code");--> statement-breakpoint
ALTER TABLE "code_counters" ADD CONSTRAINT "code_counters_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;