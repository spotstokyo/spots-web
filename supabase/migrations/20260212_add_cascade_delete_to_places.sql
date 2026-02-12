-- Add ON DELETE CASCADE to all tables referencing places

-- place_hours
ALTER TABLE "public"."place_hours"
DROP CONSTRAINT IF EXISTS "place_hours_place_id_fkey",
ADD CONSTRAINT "place_hours_place_id_fkey"
FOREIGN KEY ("place_id")
REFERENCES "public"."places" ("id")
ON DELETE CASCADE;

-- place_banners
ALTER TABLE "public"."place_banners"
DROP CONSTRAINT IF EXISTS "place_banners_place_id_fkey",
ADD CONSTRAINT "place_banners_place_id_fkey"
FOREIGN KEY ("place_id")
REFERENCES "public"."places" ("id")
ON DELETE CASCADE;

-- posts
ALTER TABLE "public"."posts"
DROP CONSTRAINT IF EXISTS "posts_place_id_fkey",
ADD CONSTRAINT "posts_place_id_fkey"
FOREIGN KEY ("place_id")
REFERENCES "public"."places" ("id")
ON DELETE CASCADE;

-- reviews
ALTER TABLE "public"."reviews"
DROP CONSTRAINT IF EXISTS "reviews_place_id_fkey",
ADD CONSTRAINT "reviews_place_id_fkey"
FOREIGN KEY ("place_id")
REFERENCES "public"."places" ("id")
ON DELETE CASCADE;

-- user_list_entries
ALTER TABLE "public"."user_list_entries"
DROP CONSTRAINT IF EXISTS "user_list_entries_place_id_fkey",
ADD CONSTRAINT "user_list_entries_place_id_fkey"
FOREIGN KEY ("place_id")
REFERENCES "public"."places" ("id")
ON DELETE CASCADE;

-- place_visits
ALTER TABLE "public"."place_visits"
DROP CONSTRAINT IF EXISTS "place_visits_place_id_fkey",
ADD CONSTRAINT "place_visits_place_id_fkey"
FOREIGN KEY ("place_id")
REFERENCES "public"."places" ("id")
ON DELETE CASCADE;

-- place_auras
ALTER TABLE "public"."place_auras"
DROP CONSTRAINT IF EXISTS "place_auras_place_id_fkey",
ADD CONSTRAINT "place_auras_place_id_fkey"
FOREIGN KEY ("place_id")
REFERENCES "public"."places" ("id")
ON DELETE CASCADE;
