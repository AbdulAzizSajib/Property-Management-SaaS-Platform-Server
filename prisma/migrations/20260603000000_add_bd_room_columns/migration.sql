-- Add Bangladesh-specific room layout columns to Unit
ALTER TABLE "Unit"
    ADD COLUMN "drawingRooms" INTEGER,
    ADD COLUMN "diningRooms"  INTEGER,
    ADD COLUMN "kitchens"     INTEGER,
    ADD COLUMN "balconies"    INTEGER;
