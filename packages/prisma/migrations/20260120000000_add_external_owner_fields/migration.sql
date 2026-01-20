-- Add external owner fields for audit trail display
-- These store the GitLaw user info instead of the API account owner
ALTER TABLE "DocumentMeta" ADD COLUMN "externalOwnerName" TEXT;
ALTER TABLE "DocumentMeta" ADD COLUMN "externalOwnerEmail" TEXT;
