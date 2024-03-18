-- CreateTable
CREATE TABLE "NewUser" (
    "privyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLogin" TIMESTAMP(3),
    "streak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER DEFAULT 0,
    "manaBalance" INTEGER NOT NULL DEFAULT 0,
    "totalManaEarned" INTEGER NOT NULL DEFAULT 0,
    "ANKYBalance" INTEGER NOT NULL DEFAULT 0,
    "lastNotified" TIMESTAMP(3),

    CONSTRAINT "NewUser_pkey" PRIMARY KEY ("privyId")
);

-- CreateTable
CREATE TABLE "NewMana" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewMana_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewManaTransaction" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cid" TEXT,

    CONSTRAINT "NewManaTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewWritingSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "manaEarned" DOUBLE PRECISION NOT NULL,
    "multiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "writingCID" TEXT,

    CONSTRAINT "NewWritingSession_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "NewMana" ADD CONSTRAINT "NewMana_userId_fkey" FOREIGN KEY ("userId") REFERENCES "NewUser"("privyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewManaTransaction" ADD CONSTRAINT "NewManaTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "NewUser"("privyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewWritingSession" ADD CONSTRAINT "NewWritingSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "NewUser"("privyId") ON DELETE RESTRICT ON UPDATE CASCADE;
