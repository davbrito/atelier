-- Custom migration: force RLS on the quotation tables.
--
-- The pgPolicy definitions in src/db/schema.ts make drizzle-kit generate the
-- ENABLE ROW LEVEL SECURITY + CREATE POLICY statements (previous migration),
-- but drizzle-kit's schema differ never emits FORCE ROW LEVEL SECURITY. It is
-- required here because the app connects as the table owner, and owners bypass
-- plain RLS — without FORCE the immutability policies would not apply to the
-- app itself. Hence this custom migration (drizzle-kit generate --custom).
--
-- NOTE for future data-fix migrations: with FORCE active an UPDATE against
-- these tables affects 0 rows silently. Run `ALTER TABLE <t> NO FORCE ROW
-- LEVEL SECURITY;` before the fix and restore FORCE afterwards.
ALTER TABLE "quotations" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "quotation_materials" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "quotation_operations" FORCE ROW LEVEL SECURITY;
