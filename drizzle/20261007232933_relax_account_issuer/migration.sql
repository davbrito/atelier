DROP INDEX IF EXISTS "account_issuer_accountId_uidx";
ALTER TABLE "account" ALTER COLUMN "issuer" DROP NOT NULL;
