-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('ONLINE', 'OFFLINE', 'SYNCING', 'DISCONNECTED');

-- CreateEnum
CREATE TYPE "SnapshotReason" AS ENUM ('MANUAL', 'AUTO', 'RESTORE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "currentVersion" INTEGER NOT NULL DEFAULT 1,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentMember" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'EDITOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Operation" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "lamport" INTEGER NOT NULL,
    "clientId" TEXT NOT NULL,
    "operationType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "checksum" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Operation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentSnapshot" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdBy" TEXT NOT NULL,
    "reason" "SnapshotReason" NOT NULL DEFAULT 'AUTO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "lastSeenOperation" INTEGER NOT NULL DEFAULT 0,
    "lastHeartbeat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "SyncStatus" NOT NULL DEFAULT 'ONLINE',

    CONSTRAINT "SyncSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "Document_ownerId_idx" ON "Document"("ownerId");

-- CreateIndex
CREATE INDEX "Document_updatedAt_idx" ON "Document"("updatedAt");

-- CreateIndex
CREATE INDEX "DocumentMember_documentId_idx" ON "DocumentMember"("documentId");

-- CreateIndex
CREATE INDEX "DocumentMember_userId_idx" ON "DocumentMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentMember_documentId_userId_key" ON "DocumentMember"("documentId", "userId");

-- CreateIndex
CREATE INDEX "Operation_documentId_lamport_idx" ON "Operation"("documentId", "lamport");

-- CreateIndex
CREATE INDEX "Operation_documentId_createdAt_idx" ON "Operation"("documentId", "createdAt");

-- CreateIndex
CREATE INDEX "Operation_documentId_checksum_idx" ON "Operation"("documentId", "checksum");

-- CreateIndex
CREATE INDEX "Operation_documentId_clientId_idx" ON "Operation"("documentId", "clientId");

-- CreateIndex
CREATE UNIQUE INDEX "Operation_documentId_checksum_key" ON "Operation"("documentId", "checksum");

-- CreateIndex
CREATE INDEX "DocumentSnapshot_documentId_version_idx" ON "DocumentSnapshot"("documentId", "version");

-- CreateIndex
CREATE INDEX "DocumentSnapshot_documentId_createdAt_idx" ON "DocumentSnapshot"("documentId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentSnapshot_documentId_version_key" ON "DocumentSnapshot"("documentId", "version");

-- CreateIndex
CREATE INDEX "SyncSession_userId_idx" ON "SyncSession"("userId");

-- CreateIndex
CREATE INDEX "SyncSession_clientId_idx" ON "SyncSession"("clientId");

-- CreateIndex
CREATE INDEX "SyncSession_status_idx" ON "SyncSession"("status");

-- CreateIndex
CREATE UNIQUE INDEX "SyncSession_userId_clientId_key" ON "SyncSession"("userId", "clientId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentMember" ADD CONSTRAINT "DocumentMember_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentMember" ADD CONSTRAINT "DocumentMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Operation" ADD CONSTRAINT "Operation_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Operation" ADD CONSTRAINT "Operation_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentSnapshot" ADD CONSTRAINT "DocumentSnapshot_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentSnapshot" ADD CONSTRAINT "DocumentSnapshot_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncSession" ADD CONSTRAINT "SyncSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
