-- CreateEnum
CREATE TYPE "DigestFrequency" AS ENUM ('ONCE', 'TWICE');

-- CreateEnum
CREATE TYPE "SaveSource" AS ENUM ('EXTENSION', 'PASTE');

-- CreateEnum
CREATE TYPE "SaveKind" AS ENUM ('ARTICLE', 'VIDEO', 'PODCAST', 'PDF', 'POST', 'SNIPPET', 'TEXT', 'IMAGE', 'OTHER');

-- CreateTable
CREATE TABLE "brains" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "frequency" "DigestFrequency" NOT NULL DEFAULT 'TWICE',
    "delivery_days" INTEGER[] DEFAULT ARRAY[2, 6]::INTEGER[],
    "delivery_hour" INTEGER NOT NULL DEFAULT 7,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "podcast_minutes" INTEGER NOT NULL DEFAULT 10,
    "last_issue_at" TIMESTAMPTZ(6),
    "archived_at" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "brains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saves" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "brain_id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "source" "SaveSource" NOT NULL,
    "kind" "SaveKind" NOT NULL,
    "url" TEXT,
    "title" TEXT NOT NULL,
    "site_name" TEXT,
    "text" TEXT,
    "selection" TEXT,
    "captions" TEXT,
    "note" TEXT,
    "issue_id" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "saves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issues" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "brain_id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "audio_key" TEXT,
    "audio_duration_sec" INTEGER,
    "published_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "last_used_at" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(6),

    CONSTRAINT "api_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_digest_preferences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "wants_read" BOOLEAN NOT NULL DEFAULT true,
    "wants_listen" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_digest_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "brains_organization_id_archived_at_idx" ON "brains"("organization_id", "archived_at");

-- CreateIndex
CREATE UNIQUE INDEX "brains_organization_id_slug_key" ON "brains"("organization_id", "slug");

-- CreateIndex
CREATE INDEX "saves_brain_id_issue_id_createdAt_idx" ON "saves"("brain_id", "issue_id", "createdAt");

-- CreateIndex
CREATE INDEX "saves_organization_id_idx" ON "saves"("organization_id");

-- CreateIndex
CREATE INDEX "saves_created_by_id_createdAt_idx" ON "saves"("created_by_id", "createdAt");

-- CreateIndex
CREATE INDEX "issues_organization_id_published_at_idx" ON "issues"("organization_id", "published_at");

-- CreateIndex
CREATE UNIQUE INDEX "issues_brain_id_number_key" ON "issues"("brain_id", "number");

-- CreateIndex
CREATE UNIQUE INDEX "api_tokens_token_hash_key" ON "api_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "api_tokens_user_id_idx" ON "api_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_digest_preferences_user_id_key" ON "user_digest_preferences"("user_id");

-- AddForeignKey
ALTER TABLE "brains" ADD CONSTRAINT "brains_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brains" ADD CONSTRAINT "brains_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saves" ADD CONSTRAINT "saves_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saves" ADD CONSTRAINT "saves_brain_id_fkey" FOREIGN KEY ("brain_id") REFERENCES "brains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saves" ADD CONSTRAINT "saves_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saves" ADD CONSTRAINT "saves_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "issues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_brain_id_fkey" FOREIGN KEY ("brain_id") REFERENCES "brains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_tokens" ADD CONSTRAINT "api_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_digest_preferences" ADD CONSTRAINT "user_digest_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: every existing organization gets a default brain, owned by its first OWNER.
INSERT INTO "brains" ("id", "organization_id", "created_by_id", "name", "slug", "updatedAt")
SELECT gen_random_uuid()::text, o."id", m."user_id", 'My brain', 'my-brain', CURRENT_TIMESTAMP
FROM "organizations" o
JOIN LATERAL (
    SELECT "user_id" FROM "organization_members"
    WHERE "organization_id" = o."id" AND "role" = 'OWNER'
    ORDER BY "createdAt" ASC
    LIMIT 1
) m ON true;
