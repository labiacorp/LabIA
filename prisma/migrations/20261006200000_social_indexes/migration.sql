-- CreateIndex
CREATE INDEX "social_posts_account_id_idx" ON "social_posts"("account_id");

-- CreateIndex
CREATE INDEX "ledger_entries_social_post_id_idx" ON "ledger_entries"("social_post_id");
