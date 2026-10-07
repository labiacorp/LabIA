CREATE TABLE "prompt_overrides" (
    "key" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "updated_by" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "prompt_overrides_pkey" PRIMARY KEY ("key")
);
