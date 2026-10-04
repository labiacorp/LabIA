CREATE TABLE "content_templates" (
 "id" TEXT NOT NULL PRIMARY KEY, "user_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "source_content_id" TEXT NOT NULL, "name" TEXT NOT NULL, "title" TEXT NOT NULL, "idea" TEXT NOT NULL,
 "script" TEXT NOT NULL DEFAULT '', "aspect_ratio" TEXT NOT NULL, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "content_templates_user_id_source_content_id_key" ON "content_templates"("user_id", "source_content_id");
CREATE INDEX "content_templates_user_id_updated_at_idx" ON "content_templates"("user_id", "updated_at");
