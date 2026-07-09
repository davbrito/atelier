CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"organization_id" text NOT NULL,
	"name" varchar(255) NOT NULL,
	"phone" varchar(50),
	"email" varchar(255),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_measurements" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"client_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"value" varchar(100) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "client_measurements" ADD CONSTRAINT "client_measurements_client_id_clients_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE;