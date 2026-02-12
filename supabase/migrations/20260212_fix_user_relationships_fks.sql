-- Clean up orphan records first to avoid foreign key violations
DELETE FROM "public"."user_relationships"
WHERE "requester_id" NOT IN (SELECT "id" FROM "public"."profiles");

DELETE FROM "public"."user_relationships"
WHERE "addressee_id" NOT IN (SELECT "id" FROM "public"."profiles");

-- Add foreign key constraints to user_relationships if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'user_relationships_requester_id_fkey'
    ) THEN
        ALTER TABLE "public"."user_relationships"
        ADD CONSTRAINT "user_relationships_requester_id_fkey"
        FOREIGN KEY ("requester_id")
        REFERENCES "public"."profiles" ("id")
        ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'user_relationships_addressee_id_fkey'
    ) THEN
        ALTER TABLE "public"."user_relationships"
        ADD CONSTRAINT "user_relationships_addressee_id_fkey"
        FOREIGN KEY ("addressee_id")
        REFERENCES "public"."profiles" ("id")
        ON DELETE CASCADE;
    END IF;
END $$;
