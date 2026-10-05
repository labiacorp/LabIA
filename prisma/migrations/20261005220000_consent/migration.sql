-- No backfill: accounts created before this migration never accepted anything and stay null.
ALTER TABLE "users" ADD COLUMN "consent_accepted_at" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "consent_terms_version" TEXT;
