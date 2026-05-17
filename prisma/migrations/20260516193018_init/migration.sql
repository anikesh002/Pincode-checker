-- CreateTable
CREATE TABLE "ShopSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "widgetVariant" TEXT NOT NULL DEFAULT 'minimal',
    "primaryColor" TEXT NOT NULL DEFAULT '#111111',
    "accentColor" TEXT NOT NULL DEFAULT '#22c55e',
    "buttonText" TEXT NOT NULL DEFAULT 'Check',
    "placeholderText" TEXT NOT NULL DEFAULT 'Enter pincode',
    "showCodBadge" BOOLEAN NOT NULL DEFAULT true,
    "showCityName" BOOLEAN NOT NULL DEFAULT true,
    "borderRadius" INTEGER NOT NULL DEFAULT 8,
    "customCss" TEXT NOT NULL DEFAULT '',
    "expressLabel" TEXT NOT NULL DEFAULT 'Express Delivery',
    "standardLabel" TEXT NOT NULL DEFAULT 'Standard Delivery',
    "unavailableLabel" TEXT NOT NULL DEFAULT 'Delivery not available',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Pincode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "deliveryType" TEXT NOT NULL DEFAULT 'standard',
    "deliveryDays" TEXT NOT NULL DEFAULT '3-5',
    "codAvailable" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PincodeCheck" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "found" BOOLEAN NOT NULL,
    "productId" TEXT,
    "pageUrl" TEXT,
    "checkedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ImportJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "importedRows" INTEGER NOT NULL DEFAULT 0,
    "errorRows" INTEGER NOT NULL DEFAULT 0,
    "fileName" TEXT,
    "errorLog" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "ShopSettings_shop_key" ON "ShopSettings"("shop");

-- CreateIndex
CREATE INDEX "Pincode_shop_idx" ON "Pincode"("shop");

-- CreateIndex
CREATE INDEX "Pincode_pincode_idx" ON "Pincode"("pincode");

-- CreateIndex
CREATE UNIQUE INDEX "Pincode_shop_pincode_key" ON "Pincode"("shop", "pincode");

-- CreateIndex
CREATE INDEX "PincodeCheck_shop_idx" ON "PincodeCheck"("shop");

-- CreateIndex
CREATE INDEX "PincodeCheck_shop_checkedAt_idx" ON "PincodeCheck"("shop", "checkedAt");

-- CreateIndex
CREATE INDEX "PincodeCheck_pincode_idx" ON "PincodeCheck"("pincode");
