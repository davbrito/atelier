CREATE TABLE "whitelist_emails" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"email" varchar(255) NOT NULL UNIQUE,
	"added_by_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "whitelist_emails" ADD CONSTRAINT "whitelist_emails_added_by_id_user_id_fkey" FOREIGN KEY ("added_by_id") REFERENCES "user"("id") ON DELETE CASCADE;