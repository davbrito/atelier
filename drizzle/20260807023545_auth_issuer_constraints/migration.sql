CREATE UNIQUE INDEX "account_issuer_accountId_uidx" ON "account" ("issuer","account_id");
ALTER TABLE "account" ALTER COLUMN "issuer" SET NOT NULL;