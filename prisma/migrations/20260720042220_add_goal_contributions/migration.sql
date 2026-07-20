-- AlterTable
ALTER TABLE "Goal" ADD COLUMN     "contributionAmount" DECIMAL(14,2),
ADD COLUMN     "contributionFrequency" "Frequency",
ADD COLUMN     "contributionNextDate" DATE;
