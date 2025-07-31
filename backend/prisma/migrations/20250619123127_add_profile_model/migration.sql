-- CreateTable
CREATE TABLE "Profile" (
    "id" SERIAL NOT NULL,
    "data" JSONB NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);
