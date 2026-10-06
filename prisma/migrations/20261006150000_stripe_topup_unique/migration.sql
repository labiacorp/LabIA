-- One credit per Stripe Checkout session, even if the webhook is delivered twice or at once.
CREATE UNIQUE INDEX "ledger_entries_stripe_session_key" ON "ledger_entries" ("note") WHERE "note" LIKE 'stripe:%';
