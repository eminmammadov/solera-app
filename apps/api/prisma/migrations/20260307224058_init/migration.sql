-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Admin',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogPost" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "content" TEXT[],
    "category" TEXT NOT NULL,
    "author" TEXT NOT NULL DEFAULT 'Solera Team',
    "readTime" TEXT NOT NULL DEFAULT '5 min read',
    "coverImage" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketToken" (
    "id" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "chg24h" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "stake7d" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "stake1m" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "stake3m" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "stake6m" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "stake12m" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "category" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '',
    "isImage" BOOLEAN NOT NULL DEFAULT false,
    "colorBg" TEXT,
    "priceColor" TEXT,
    "priceDecimalColor" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsItem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "tags" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocsCategory" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'Rocket',
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DocsCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocsPage" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DocsPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocsSection" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "anchor" TEXT NOT NULL,
    "content" TEXT[],
    "pageId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DocsSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformMetrics" (
    "id" TEXT NOT NULL,
    "platformTvl" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "platformTvlChange" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "activeStakers" INTEGER NOT NULL DEFAULT 0,
    "activeStakersChange" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgApy" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalRewards" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalStakedRa" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalStakedUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalUsers" INTEGER NOT NULL DEFAULT 0,
    "onlineUsers" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "BlogPost_slug_key" ON "BlogPost"("slug");

-- CreateIndex
CREATE INDEX "BlogPost_slug_idx" ON "BlogPost"("slug");

-- CreateIndex
CREATE INDEX "BlogPost_category_idx" ON "BlogPost"("category");

-- CreateIndex
CREATE INDEX "BlogPost_isPublished_idx" ON "BlogPost"("isPublished");

-- CreateIndex
CREATE UNIQUE INDEX "MarketToken_ticker_key" ON "MarketToken"("ticker");

-- CreateIndex
CREATE INDEX "MarketToken_ticker_idx" ON "MarketToken"("ticker");

-- CreateIndex
CREATE INDEX "MarketToken_category_idx" ON "MarketToken"("category");

-- CreateIndex
CREATE INDEX "DocsCategory_order_idx" ON "DocsCategory"("order");

-- CreateIndex
CREATE UNIQUE INDEX "DocsPage_slug_key" ON "DocsPage"("slug");

-- CreateIndex
CREATE INDEX "DocsPage_slug_idx" ON "DocsPage"("slug");

-- CreateIndex
CREATE INDEX "DocsPage_categoryId_idx" ON "DocsPage"("categoryId");

-- CreateIndex
CREATE INDEX "DocsSection_pageId_idx" ON "DocsSection"("pageId");

-- AddForeignKey
ALTER TABLE "DocsPage" ADD CONSTRAINT "DocsPage_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "DocsCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocsSection" ADD CONSTRAINT "DocsSection_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "DocsPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
