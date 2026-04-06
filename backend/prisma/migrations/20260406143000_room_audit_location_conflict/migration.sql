-- CreateTable
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "username" VARCHAR(255),
    "account" VARCHAR(255),
    "role" VARCHAR(20),
    "action" VARCHAR(100) NOT NULL,
    "resource_type" VARCHAR(50),
    "resource_id" VARCHAR(255),
    "status" VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',
    "metadata" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "schedules"
    ADD COLUMN "location_type" VARCHAR(30) NOT NULL DEFAULT 'EXTERNAL_LOCATION',
    ADD COLUMN "external_location" VARCHAR(500),
    ADD COLUMN "reminder_sent_at" TIMESTAMP(3),
    ADD COLUMN "room_id" TEXT;

-- Backfill external location for existing rows
UPDATE "schedules"
SET "external_location" = "location"
WHERE "external_location" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "rooms_name_key" ON "rooms"("name");

-- CreateIndex
CREATE INDEX "rooms_priority_idx" ON "rooms"("priority");

-- CreateIndex
CREATE INDEX "rooms_is_active_idx" ON "rooms"("is_active");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "schedules_room_id_idx" ON "schedules"("room_id");

-- CreateIndex
CREATE INDEX "schedules_date_location_type_idx" ON "schedules"("date", "location_type");

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_room_id_fkey"
FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
