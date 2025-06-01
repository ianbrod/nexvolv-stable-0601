-- AlterTable
ALTER TABLE "SavedFilter" ADD COLUMN "type" TEXT DEFAULT 'task';

-- CreateIndex
CREATE INDEX "SavedFilter_type_idx" ON "SavedFilter"("type");
