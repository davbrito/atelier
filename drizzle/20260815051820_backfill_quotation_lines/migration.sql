-- Custom migration: backfill quotation_lines from the existing single
-- quotations.budget_id (one line per quotation), then point every existing
-- quotation_materials/quotation_operations row at that new line.
--
-- quotation_materials/quotation_operations have FORCE ROW LEVEL SECURITY
-- (see 20260702181552_quotation_rls_force), so the app-owner connection that
-- runs migrations cannot UPDATE them while FORCE is active — temporarily
-- disable it around the backfill and restore it immediately after.
INSERT INTO quotation_lines (id, quotation_id, budget_id, created_at)
SELECT uuidv7(), id, budget_id, created_at FROM quotations WHERE budget_id IS NOT NULL;

ALTER TABLE quotation_materials NO FORCE ROW LEVEL SECURITY;
UPDATE quotation_materials qm
SET quotation_line_id = ql.id
FROM quotation_lines ql
WHERE ql.quotation_id = qm.quotation_id;
ALTER TABLE quotation_materials FORCE ROW LEVEL SECURITY;

ALTER TABLE quotation_operations NO FORCE ROW LEVEL SECURITY;
UPDATE quotation_operations qo
SET quotation_line_id = ql.id
FROM quotation_lines ql
WHERE ql.quotation_id = qo.quotation_id;
ALTER TABLE quotation_operations FORCE ROW LEVEL SECURITY;
