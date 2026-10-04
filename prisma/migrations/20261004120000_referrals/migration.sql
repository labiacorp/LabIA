ALTER TABLE "users" ADD COLUMN "referral_code" TEXT, ADD COLUMN "referred_by_id" TEXT;
CREATE UNIQUE INDEX "users_referral_code_key" ON "users"("referral_code");
CREATE INDEX "users_referred_by_id_idx" ON "users"("referred_by_id");
ALTER TABLE "users" ADD CONSTRAINT "users_referred_by_id_fkey" FOREIGN KEY ("referred_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "users" ADD CONSTRAINT "users_no_self_referral" CHECK ("referred_by_id" IS NULL OR "referred_by_id" <> "id");
