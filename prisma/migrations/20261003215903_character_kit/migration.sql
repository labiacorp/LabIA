-- CreateEnum
CREATE TYPE "AssetRole" AS ENUM ('SHEET', 'FRONT', 'PROFILE', 'DETAIL');

-- AlterEnum
ALTER TYPE "StepKind" ADD VALUE 'CHARACTER';

-- AlterTable
ALTER TABLE "assets" ADD COLUMN     "role" "AssetRole";

-- AlterTable
ALTER TABLE "influencers" ADD COLUMN     "visual_signature" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "steps" ADD COLUMN     "influencer_id" TEXT,
ADD COLUMN     "provider" TEXT NOT NULL DEFAULT 'fal',
ADD COLUMN     "role" "AssetRole",
ALTER COLUMN "content_id" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "steps_influencer_id_created_at_idx" ON "steps"("influencer_id", "created_at");

-- AddForeignKey
ALTER TABLE "steps" ADD CONSTRAINT "steps_influencer_id_fkey" FOREIGN KEY ("influencer_id") REFERENCES "influencers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
