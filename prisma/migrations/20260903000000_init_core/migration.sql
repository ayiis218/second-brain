-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "EntrySource" AS ENUM ('NATIVE', 'FINANCE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,

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
CREATE TABLE "Entry" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT,
    "content" JSONB NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "source" "EntrySource" NOT NULL DEFAULT 'NATIVE',
    "sourceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "searchVector" tsvector,

    CONSTRAINT "Entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntryTag" (
    "entryId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "EntryTag_pkey" PRIMARY KEY ("entryId","tagId")
);

-- CreateTable
CREATE TABLE "EntryLink" (
    "id" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'related',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EntryLink_pkey" PRIMARY KEY ("id")
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
CREATE INDEX "Entry_occurredAt_id_idx" ON "Entry"("occurredAt" DESC, "id");

-- CreateIndex
CREATE INDEX "Entry_type_occurredAt_idx" ON "Entry"("type", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "Entry_deletedAt_idx" ON "Entry"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Entry_source_sourceId_key" ON "Entry"("source", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE INDEX "EntryTag_tagId_idx" ON "EntryTag"("tagId");

-- CreateIndex
CREATE INDEX "EntryLink_toId_idx" ON "EntryLink"("toId");

-- CreateIndex
CREATE UNIQUE INDEX "EntryLink_fromId_toId_kind_key" ON "EntryLink"("fromId", "toId", "kind");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntryTag" ADD CONSTRAINT "EntryTag_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "Entry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntryTag" ADD CONSTRAINT "EntryTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntryLink" ADD CONSTRAINT "EntryLink_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "Entry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntryLink" ADD CONSTRAINT "EntryLink_toId_fkey" FOREIGN KEY ("toId") REFERENCES "Entry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Trigger: updatedAt + searchVector selalu konsisten, apa pun jalur
-- penulisannya (Prisma, SQL mentah, atau cascade). Pelajaran langsung dari
-- finance-dashboard: @updatedAt Prisma di-set client dan bisa terlewat.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION entry_before_write()
RETURNS TRIGGER AS $fn$
BEGIN
  NEW."updatedAt" := CURRENT_TIMESTAMP;
  NEW."searchVector" :=
    setweight(to_tsvector('simple', coalesce(NEW."title", '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW."content"->>'body', '')), 'B');
  RETURN NEW;
END;
$fn$ LANGUAGE plpgsql;

CREATE TRIGGER entry_before_write
  BEFORE INSERT OR UPDATE ON "Entry"
  FOR EACH ROW EXECUTE FUNCTION entry_before_write();

-- Konfigurasi 'simple', bukan 'english': konten campur Indonesia/Inggris,
-- stemming Inggris justru merusak kata Indonesia.
CREATE INDEX "Entry_searchVector_idx" ON "Entry" USING GIN ("searchVector");
