-- Improve News feed query performance
CREATE INDEX "NewsItem_isActive_idx" ON "NewsItem"("isActive");
CREATE INDEX "NewsItem_createdAt_idx" ON "NewsItem"("createdAt");

