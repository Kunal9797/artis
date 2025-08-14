-- Add externalId column to Contacts table in Supabase
ALTER TABLE "Contacts" 
ADD COLUMN IF NOT EXISTS "externalId" VARCHAR(255) NULL;

-- Add a comment for documentation
COMMENT ON COLUMN "Contacts"."externalId" IS 'External ID from Wix or other sources';

-- Optionally, add an index for faster lookups by externalId
CREATE INDEX IF NOT EXISTS idx_contacts_external_id ON "Contacts" ("externalId");