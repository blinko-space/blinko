-- CreateTable
CREATE TABLE "plugin" (
    "id" SERIAL NOT NULL,
    "metadata" JSON NOT NULL,
    "path" VARCHAR NOT NULL,
    "isUse" BOOLEAN NOT NULL DEFAULT true,
    "isDev" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "plugin_pkey" PRIMARY KEY ("id")
);
