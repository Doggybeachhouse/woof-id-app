-- Add Mplus relation number to users for kassa sync
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mplusRelationNumber" INTEGER;
