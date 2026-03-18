-- Add persisted vote metrics to NewsItem
ALTER TABLE "NewsItem"
ADD COLUMN "upvotes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "downvotes" INTEGER NOT NULL DEFAULT 0;

-- Vote type enum and vote table (one vote per client key per news item)
CREATE TYPE "NewsVoteType" AS ENUM ('UP', 'DOWN');

CREATE TABLE "NewsVote" (
    "id" TEXT NOT NULL,
    "newsItemId" TEXT NOT NULL,
    "clientKey" TEXT NOT NULL,
    "voteType" "NewsVoteType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsVote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NewsVote_newsItemId_clientKey_key" ON "NewsVote"("newsItemId", "clientKey");
CREATE INDEX "NewsVote_clientKey_idx" ON "NewsVote"("clientKey");

ALTER TABLE "NewsVote"
ADD CONSTRAINT "NewsVote_newsItemId_fkey"
FOREIGN KEY ("newsItemId") REFERENCES "NewsItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

