-- Add Firebase UID for Firebase Authentication linkage.
ALTER TABLE "users" ADD COLUMN "firebaseUid" TEXT;

CREATE UNIQUE INDEX "users_firebaseUid_key" ON "users"("firebaseUid");
