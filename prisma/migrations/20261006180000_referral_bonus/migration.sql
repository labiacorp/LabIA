-- Referral credit (src/lib/referrals.ts): one bonus per referred account and side, even if the webhook repeats.
ALTER TYPE "LedgerReason" ADD VALUE 'REFERRAL';
CREATE UNIQUE INDEX "ledger_entries_referral_key" ON "ledger_entries" ("note") WHERE "note" LIKE 'referral%';
