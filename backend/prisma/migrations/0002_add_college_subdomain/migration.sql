ALTER TABLE "colleges"
ADD COLUMN IF NOT EXISTS "subdomain" VARCHAR(80);

UPDATE "colleges"
SET "subdomain" = LOWER("id")
WHERE "subdomain" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "colleges_subdomain_key"
ON "colleges"("subdomain");
