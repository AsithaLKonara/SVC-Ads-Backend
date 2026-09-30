-- AlterTable: Add views column to Ad
ALTER TABLE "Ad" ADD COLUMN IF NOT EXISTS "views" INTEGER NOT NULL DEFAULT 0;

-- CreateEnum: MessageStatus
DO $$ BEGIN
    CREATE TYPE "MessageStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'RESOLVED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable: SiteVisit
CREATE TABLE IF NOT EXISTS "SiteVisit" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "adId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SiteVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AuditLog
CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "entityName" TEXT,
    "actorId" TEXT,
    "actorName" TEXT,
    "actorRole" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Message
CREATE TABLE IF NOT EXISTS "Message" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "status" "MessageStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable: MessageFollowup
CREATE TABLE IF NOT EXISTS "MessageFollowup" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "status" "MessageStatus" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MessageFollowup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: SiteVisit
CREATE INDEX IF NOT EXISTS "SiteVisit_createdAt_idx" ON "SiteVisit"("createdAt");
CREATE INDEX IF NOT EXISTS "SiteVisit_sessionId_idx" ON "SiteVisit"("sessionId");
CREATE INDEX IF NOT EXISTS "SiteVisit_adId_idx" ON "SiteVisit"("adId");

-- CreateIndex: AuditLog
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_entity_idx" ON "AuditLog"("entity");
CREATE INDEX IF NOT EXISTS "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex: Message
CREATE INDEX IF NOT EXISTS "Message_createdAt_idx" ON "Message"("createdAt");
CREATE INDEX IF NOT EXISTS "Message_isRead_idx" ON "Message"("isRead");
CREATE INDEX IF NOT EXISTS "Message_status_idx" ON "Message"("status");

-- CreateIndex: MessageFollowup
CREATE INDEX IF NOT EXISTS "MessageFollowup_messageId_idx" ON "MessageFollowup"("messageId");
CREATE INDEX IF NOT EXISTS "MessageFollowup_createdAt_idx" ON "MessageFollowup"("createdAt");

-- AddForeignKey: SiteVisit -> Ad
ALTER TABLE "SiteVisit" DROP CONSTRAINT IF EXISTS "SiteVisit_adId_fkey";
ALTER TABLE "SiteVisit" ADD CONSTRAINT "SiteVisit_adId_fkey" FOREIGN KEY ("adId") REFERENCES "Ad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: MessageFollowup -> Message
ALTER TABLE "MessageFollowup" DROP CONSTRAINT IF EXISTS "MessageFollowup_messageId_fkey";
ALTER TABLE "MessageFollowup" ADD CONSTRAINT "MessageFollowup_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
