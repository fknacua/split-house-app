-- CreateTable
CREATE TABLE "idempotent_request" (
    "key" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "response" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idempotent_request_pkey" PRIMARY KEY ("key")
);

