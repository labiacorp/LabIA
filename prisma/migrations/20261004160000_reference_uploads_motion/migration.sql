ALTER TABLE "contents" ADD COLUMN "motion" JSONB;
ALTER TABLE "assets" ADD COLUMN "storage_key" TEXT, ADD COLUMN "content_type" TEXT, ADD COLUMN "file_name" TEXT, ADD COLUMN "size_bytes" INTEGER;
