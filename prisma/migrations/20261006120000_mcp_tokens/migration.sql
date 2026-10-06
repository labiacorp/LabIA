CREATE TABLE "api_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "scopes" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    CONSTRAINT "api_tokens_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "api_tokens_token_hash_key" ON "api_tokens"("token_hash");
ALTER TABLE "api_tokens" ADD CONSTRAINT "api_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "api_usage" (
    "id" BIGSERIAL NOT NULL,
    "token_id" TEXT NOT NULL,
    "tool" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "api_usage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "api_usage_token_id_created_at_idx" ON "api_usage"("token_id", "created_at");
ALTER TABLE "api_usage" ADD CONSTRAINT "api_usage_token_id_fkey" FOREIGN KEY ("token_id") REFERENCES "api_tokens"("id") ON DELETE CASCADE ON UPDATE CASCADE;
