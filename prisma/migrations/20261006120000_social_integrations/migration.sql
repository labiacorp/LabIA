CREATE TYPE "SocialNetwork" AS ENUM ('X', 'INSTAGRAM', 'TIKTOK', 'LINKEDIN', 'THREADS', 'YOUTUBE', 'FACEBOOK', 'BLUESKY');
CREATE TYPE "SocialAccountStatus" AS ENUM ('CONNECTED', 'EXPIRED', 'ERROR', 'DISCONNECTED');
CREATE TYPE "SocialPostStatus" AS ENUM ('SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'FAILED', 'CANCELED', 'UNKNOWN');

CREATE TABLE "social_accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "influencer_id" TEXT,
    "network" "SocialNetwork" NOT NULL,
    "backend" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "display_name" TEXT,
    "avatar_url" TEXT,
    "status" "SocialAccountStatus" NOT NULL DEFAULT 'CONNECTED',
    "access_token" TEXT,
    "refresh_token" TEXT,
    "token_expires_at" TIMESTAMP(3),
    "scopes" TEXT,
    "connected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "social_accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "social_tenants" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "backend" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "social_tenants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "social_posts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "content_id" TEXT,
    "asset_id" TEXT,
    "text" TEXT NOT NULL,
    "ai_label" BOOLEAN NOT NULL DEFAULT true,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "status" "SocialPostStatus" NOT NULL DEFAULT 'SCHEDULED',
    "operation_key" TEXT NOT NULL,
    "claimed_at" TIMESTAMP(3),
    "provider_post_id" TEXT,
    "url" TEXT,
    "published_at" TIMESTAMP(3),
    "estimated_cost_brl" DECIMAL(12,4) NOT NULL,
    "actual_cost_brl" DECIMAL(12,4),
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "social_posts_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ledger_entries" ADD COLUMN "social_post_id" TEXT;

CREATE INDEX "social_accounts_user_id_network_idx" ON "social_accounts"("user_id", "network");
CREATE UNIQUE INDEX "social_accounts_backend_provider_account_id_key" ON "social_accounts"("backend", "provider_account_id");
CREATE UNIQUE INDEX "social_tenants_user_id_backend_key" ON "social_tenants"("user_id", "backend");
CREATE UNIQUE INDEX "social_posts_operation_key_key" ON "social_posts"("operation_key");
CREATE INDEX "social_posts_status_scheduled_at_idx" ON "social_posts"("status", "scheduled_at");
CREATE INDEX "social_posts_user_id_created_at_idx" ON "social_posts"("user_id", "created_at");

ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_social_post_id_fkey" FOREIGN KEY ("social_post_id") REFERENCES "social_posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "social_accounts" ADD CONSTRAINT "social_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "social_accounts" ADD CONSTRAINT "social_accounts_influencer_id_fkey" FOREIGN KEY ("influencer_id") REFERENCES "influencers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "social_tenants" ADD CONSTRAINT "social_tenants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "social_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "contents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
