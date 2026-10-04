ALTER TABLE "contents" ADD COLUMN "archived_at" TIMESTAMP(3);
CREATE INDEX "contents_archived_at_updated_at_idx" ON "contents"("archived_at", "updated_at");
