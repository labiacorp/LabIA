-- AlterTable
ALTER TABLE "steps" ADD COLUMN "operation_key" TEXT,
ADD COLUMN "submission_state" TEXT NOT NULL DEFAULT 'not_submitted';

-- CreateIndex
CREATE UNIQUE INDEX "steps_operation_key_key" ON "steps"("operation_key");
