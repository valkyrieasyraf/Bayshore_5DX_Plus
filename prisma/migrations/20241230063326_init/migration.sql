-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "chipId" TEXT NOT NULL,
    "accessCode" TEXT NOT NULL,
    "carOrder" INTEGER[],
    "tutorials" INTEGER NOT NULL DEFAULT 0,
    "confirmedTutorials" INTEGER[],
    "hp600Count" INTEGER NOT NULL DEFAULT 0,
    "userBanned" BOOLEAN NOT NULL DEFAULT false,
    "bookmarks" INTEGER[],
    "currentSheet" INTEGER NOT NULL DEFAULT 1,
    "lastScratched" INTEGER NOT NULL DEFAULT 0,
    "unlockAt" INTEGER NOT NULL DEFAULT 0,
    "createdAt" INTEGER NOT NULL DEFAULT round(date_part('epoch'::text, now())),
    "earnedMaxiGold" INTEGER NOT NULL DEFAULT 0,
    "maxiGold" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScratchSheet" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "sheetNo" INTEGER NOT NULL,

    CONSTRAINT "ScratchSheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScratchSquare" (
    "id" SERIAL NOT NULL,
    "sheetId" INTEGER NOT NULL,
    "category" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "earned" BOOLEAN NOT NULL,

    CONSTRAINT "ScratchSquare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserItem" (
    "userItemId" SERIAL NOT NULL,
    "category" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" INTEGER NOT NULL DEFAULT 0,
    "earnedAt" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "UserItem_pkey" PRIMARY KEY ("userItemId")
);

-- CreateTable
CREATE TABLE "Car" (
    "userId" INTEGER NOT NULL,
    "carId" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "regionId" INTEGER NOT NULL DEFAULT 1,
    "manufacturer" INTEGER NOT NULL,
    "model" INTEGER NOT NULL,
    "visualModel" INTEGER NOT NULL,
    "defaultColor" INTEGER NOT NULL,
    "customColor" INTEGER NOT NULL DEFAULT 0,
    "wheel" INTEGER NOT NULL DEFAULT 0,
    "wheelColor" INTEGER NOT NULL DEFAULT 0,
    "aero" INTEGER NOT NULL DEFAULT 0,
    "bonnet" INTEGER NOT NULL DEFAULT 0,
    "wing" INTEGER NOT NULL DEFAULT 0,
    "carGTWingDbId" INTEGER NOT NULL,
    "mirror" INTEGER NOT NULL DEFAULT 0,
    "sticker" INTEGER NOT NULL DEFAULT 0,
    "stickerColor" INTEGER NOT NULL DEFAULT 0,
    "sideSticker" INTEGER NOT NULL DEFAULT 0,
    "sideStickerColor" INTEGER NOT NULL DEFAULT 0,
    "roofSticker" INTEGER NOT NULL DEFAULT 0,
    "roofStickerColor" INTEGER NOT NULL DEFAULT 0,
    "neon" INTEGER NOT NULL DEFAULT 0,
    "trunk" INTEGER NOT NULL DEFAULT 0,
    "plate" INTEGER NOT NULL DEFAULT 0,
    "plateColor" INTEGER NOT NULL DEFAULT 0,
    "plateNumber" INTEGER NOT NULL DEFAULT 0,
    "specialSticker" INTEGER NOT NULL DEFAULT 0,
    "specialStickerColor" INTEGER NOT NULL DEFAULT 0,
    "tunePower" INTEGER NOT NULL DEFAULT 0,
    "tuneHandling" INTEGER NOT NULL DEFAULT 0,
    "title" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 0,
    "teamSticker" BOOLEAN NOT NULL DEFAULT false,
    "teamId" INTEGER,
    "teamName" TEXT,
    "teamStickerFont" INTEGER,
    "teamDecoration" INTEGER,
    "teamDecorationColor" INTEGER,
    "rivalMarker" INTEGER NOT NULL DEFAULT 0,
    "rivalMarkerColor" INTEGER NOT NULL DEFAULT 0,
    "lastPlayedAt" INTEGER NOT NULL DEFAULT 0,
    "lastPlayedPlaceId" INTEGER,
    "aura" INTEGER NOT NULL DEFAULT 0,
    "auraMotif" INTEGER NOT NULL DEFAULT 0,
    "ghostLevel" INTEGER NOT NULL DEFAULT 1,
    "country" TEXT NOT NULL DEFAULT 'JPN',
    "searchCode" TEXT NOT NULL DEFAULT 'JPN0123',
    "tuningPoint" INTEGER NOT NULL DEFAULT 0,
    "shopPoint" INTEGER NOT NULL DEFAULT 0,
    "shopGrade" INTEGER NOT NULL DEFAULT 0,
    "odometer" INTEGER NOT NULL DEFAULT 0,
    "playCount" INTEGER NOT NULL DEFAULT 0,
    "earnedCustomColor" BOOLEAN NOT NULL DEFAULT false,
    "totalMaxiGold" INTEGER NOT NULL DEFAULT 0,
    "carSettingsDbId" INTEGER NOT NULL,
    "bgmPlaylist" INTEGER[],
    "vsPlayCount" INTEGER NOT NULL DEFAULT 0,
    "vsBurstCount" INTEGER NOT NULL DEFAULT 0,
    "vsStarCount" INTEGER NOT NULL DEFAULT 0,
    "vsStarCountMax" INTEGER NOT NULL DEFAULT 0,
    "vsCoolOrWild" INTEGER NOT NULL DEFAULT 0,
    "vsSmoothOrRough" INTEGER NOT NULL DEFAULT 0,
    "vsTripleStarMedals" INTEGER NOT NULL DEFAULT 0,
    "vsDoubleStarMedals" INTEGER NOT NULL DEFAULT 0,
    "vsSingleStarMedals" INTEGER NOT NULL DEFAULT 0,
    "vsPlainMedals" INTEGER NOT NULL DEFAULT 0,
    "rgPlayCount" INTEGER NOT NULL DEFAULT 0,
    "rgWinCount" INTEGER NOT NULL DEFAULT 0,
    "maxiCoin" INTEGER NOT NULL DEFAULT 0,
    "rgBlock" INTEGER NOT NULL DEFAULT 0,
    "rgProgress" INTEGER[],
    "rgClearCount" INTEGER NOT NULL DEFAULT 0,
    "rgConsecutiveLosses" INTEGER NOT NULL DEFAULT 0,
    "rgPastClearRegions" INTEGER NOT NULL DEFAULT 0,
    "rgCharacterEffect" INTEGER NOT NULL DEFAULT 0,
    "rgMotionEffect" INTEGER NOT NULL DEFAULT 0,
    "rgStamp" INTEGER NOT NULL DEFAULT 1,
    "stPlayCount" INTEGER NOT NULL DEFAULT 0,
    "stClearBits" INTEGER NOT NULL DEFAULT 0,
    "stClearDivCount" INTEGER NOT NULL DEFAULT 0,
    "stClearCount" INTEGER NOT NULL DEFAULT 0,
    "stLoseBits" BIGINT NOT NULL DEFAULT 0,
    "stLose" BOOLEAN NOT NULL DEFAULT false,
    "stConsecutiveWins" INTEGER NOT NULL DEFAULT 0,
    "stConsecutiveWinsMax" INTEGER NOT NULL DEFAULT 0,
    "stampSheetCount" INTEGER NOT NULL DEFAULT 0,
    "stampSheet" INTEGER[],
    "auraMotifAutoChange" BOOLEAN NOT NULL DEFAULT false,
    "screenshotCount" INTEGER NOT NULL DEFAULT 0,
    "carStateDbId" INTEGER NOT NULL,

    CONSTRAINT "Car_pkey" PRIMARY KEY ("carId")
);

-- CreateTable
CREATE TABLE "CarGTWing" (
    "dbId" SERIAL NOT NULL,
    "pillar" INTEGER NOT NULL DEFAULT 0,
    "pillarMaterial" INTEGER NOT NULL DEFAULT 0,
    "mainWing" INTEGER NOT NULL DEFAULT 0,
    "mainWingColor" INTEGER NOT NULL DEFAULT 0,
    "wingTip" INTEGER NOT NULL DEFAULT 0,
    "material" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CarGTWing_pkey" PRIMARY KEY ("dbId")
);

-- CreateTable
CREATE TABLE "CarItem" (
    "dbId" SERIAL NOT NULL,
    "carId" INTEGER NOT NULL,
    "category" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,

    CONSTRAINT "CarItem_pkey" PRIMARY KEY ("dbId")
);

-- CreateTable
CREATE TABLE "CarSettings" (
    "dbId" SERIAL NOT NULL,
    "view" BOOLEAN NOT NULL DEFAULT true,
    "transmission" BOOLEAN NOT NULL DEFAULT false,
    "retire" BOOLEAN NOT NULL DEFAULT false,
    "meter" INTEGER NOT NULL DEFAULT 0,
    "navigationMap" BOOLEAN NOT NULL DEFAULT true,
    "volume" INTEGER NOT NULL DEFAULT 2,
    "bgm" INTEGER NOT NULL DEFAULT 0,
    "nameplate" INTEGER NOT NULL DEFAULT 0,
    "nameplateColor" INTEGER NOT NULL DEFAULT 0,
    "nameplateFrame" INTEGER NOT NULL DEFAULT 0,
    "nameplateFrameColor" INTEGER NOT NULL DEFAULT 0,
    "terminalBackground" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CarSettings_pkey" PRIMARY KEY ("dbId")
);

-- CreateTable
CREATE TABLE "CarState" (
    "dbId" SERIAL NOT NULL,
    "competitionState" INTEGER NOT NULL DEFAULT 0,
    "needToRename" BOOLEAN NOT NULL DEFAULT false,
    "toBeDeleted" BOOLEAN NOT NULL DEFAULT false,
    "eventJoined" BOOLEAN NOT NULL DEFAULT false,
    "maxiGoldBoostItemRemainingNum" INTEGER,
    "maxiGoldBoostItemRate" INTEGER,
    "hasOpponentGhost" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CarState_pkey" PRIMARY KEY ("dbId")
);

-- CreateTable
CREATE TABLE "TimeAttackRecord" (
    "dbId" SERIAL NOT NULL,
    "carId" INTEGER NOT NULL,
    "model" INTEGER NOT NULL,
    "time" INTEGER NOT NULL,
    "course" INTEGER NOT NULL,
    "isMorning" BOOLEAN NOT NULL,
    "section1Time" INTEGER NOT NULL,
    "section2Time" INTEGER NOT NULL,
    "section3Time" INTEGER NOT NULL,
    "section4Time" INTEGER NOT NULL,
    "section5Time" INTEGER,
    "section6Time" INTEGER,
    "section7Time" INTEGER,
    "tunePower" INTEGER NOT NULL DEFAULT 0,
    "tuneHandling" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TimeAttackRecord_pkey" PRIMARY KEY ("dbId")
);

-- CreateTable
CREATE TABLE "PlaceList" (
    "id" SERIAL NOT NULL,
    "placeId" TEXT NOT NULL,
    "regionId" INTEGER NOT NULL,
    "shopName" TEXT NOT NULL,
    "country" TEXT NOT NULL,

    CONSTRAINT "PlaceList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarCrown" (
    "dbId" SERIAL NOT NULL,
    "carId" INTEGER NOT NULL,
    "area" INTEGER NOT NULL,
    "playedAt" INTEGER NOT NULL DEFAULT 0,
    "tunePower" INTEGER NOT NULL,
    "tuneHandling" INTEGER NOT NULL,

    CONSTRAINT "CarCrown_pkey" PRIMARY KEY ("dbId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_chipId_key" ON "User"("chipId");

-- CreateIndex
CREATE UNIQUE INDEX "Car_carGTWingDbId_key" ON "Car"("carGTWingDbId");

-- CreateIndex
CREATE UNIQUE INDEX "Car_carSettingsDbId_key" ON "Car"("carSettingsDbId");

-- CreateIndex
CREATE UNIQUE INDEX "Car_carStateDbId_key" ON "Car"("carStateDbId");

-- CreateIndex
CREATE UNIQUE INDEX "CarCrown_area_key" ON "CarCrown"("area");

-- AddForeignKey
ALTER TABLE "ScratchSheet" ADD CONSTRAINT "ScratchSheet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScratchSquare" ADD CONSTRAINT "ScratchSquare_sheetId_fkey" FOREIGN KEY ("sheetId") REFERENCES "ScratchSheet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserItem" ADD CONSTRAINT "UserItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Car" ADD CONSTRAINT "Car_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Car" ADD CONSTRAINT "Car_carGTWingDbId_fkey" FOREIGN KEY ("carGTWingDbId") REFERENCES "CarGTWing"("dbId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Car" ADD CONSTRAINT "Car_lastPlayedPlaceId_fkey" FOREIGN KEY ("lastPlayedPlaceId") REFERENCES "PlaceList"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Car" ADD CONSTRAINT "Car_carSettingsDbId_fkey" FOREIGN KEY ("carSettingsDbId") REFERENCES "CarSettings"("dbId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Car" ADD CONSTRAINT "Car_carStateDbId_fkey" FOREIGN KEY ("carStateDbId") REFERENCES "CarState"("dbId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarItem" ADD CONSTRAINT "CarItem_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("carId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeAttackRecord" ADD CONSTRAINT "TimeAttackRecord_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("carId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarCrown" ADD CONSTRAINT "CarCrown_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("carId") ON DELETE RESTRICT ON UPDATE CASCADE;
