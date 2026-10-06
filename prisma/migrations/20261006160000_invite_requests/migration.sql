CREATE TABLE "invite_requests" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "invite_requests_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "invite_requests_email_key" ON "invite_requests"("email");
