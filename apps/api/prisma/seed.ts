import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const DEFAULT_DEVELOPMENT_ADMIN_WALLET =
  '8Yx4k8r2vxwpEzExHWDHrme9LQzpMos35WSLzviZRwz7';

type BlogSeedInput = {
  title: string;
  slug: string;
  summary: string;
  content: string[];
  category: string;
  author: string;
  readTime: string;
  isPublished: boolean;
  publishedAt: Date;
};

type NewsSeedInput = {
  title: string;
  source: string;
  tags: string[];
  body: string;
  articleUrl: string;
  isActive: boolean;
  upvotes: number;
  downvotes: number;
};

const parseBooleanEnv = (name: string, fallback = false): boolean => {
  const raw = process.env[name]?.trim().toLowerCase();
  if (!raw) return fallback;
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on';
};

const isProduction = process.env.NODE_ENV === 'production';

const resolveSeedAdminWalletAddress = (): string | null => {
  const configured = process.env.SEED_ADMIN_WALLET_ADDRESS?.trim();
  if (configured) return configured;
  if (isProduction) return null;
  return DEFAULT_DEVELOPMENT_ADMIN_WALLET;
};

const shouldSeedSampleContent = parseBooleanEnv('SEED_SAMPLE_CONTENT', false);

const getSampleBlogPosts = (): BlogSeedInput[] => [
  {
    title: 'Solera Mainnet Launch: A New Era for Meme Token Staking',
    slug: 'solera-mainnet-launch',
    summary:
      'Solera officially launches on Solana mainnet, introducing the first institutional-grade meme token staking infrastructure.',
    content: [
      'After months of rigorous development and testing on devnet, we are thrilled to announce the official launch of Solera on Solana mainnet.',
      'This milestone marks the beginning of a new era in meme token staking, bringing institutional-grade infrastructure to the most vibrant corner of the crypto ecosystem.',
      'Our platform introduces the revolutionary Swap Node architecture, which enables seamless token conversion during the staking process while maintaining a 1:1 price ratio.',
    ],
    category: 'Announcement',
    author: 'Solera Team',
    readTime: '5 min read',
    isPublished: true,
    publishedAt: new Date('2026-03-01'),
  },
  {
    title: "Understanding One-Way Liquidity: The Core of Solera's Tokenomics",
    slug: 'understanding-one-way-liquidity',
    summary:
      "A deep dive into how Solera's one-way liquidity model creates sustainable value growth for RA token holders.",
    content: [
      "At the heart of Solera's economic model lies a concept we call One-Way Liquidity.",
      'Unlike traditional DeFi protocols that rely on two-sided liquidity pools, Solera channels all staked value in a single direction toward the RA token.',
      'This design fundamentally changes the dynamics of token value accrual, creating a system where each staking event contributes to the growth of the RA ecosystem.',
    ],
    category: 'Education',
    author: 'Solera Team',
    readTime: '8 min read',
    isPublished: true,
    publishedAt: new Date('2026-02-25'),
  },
  {
    title: 'Raydium DEX Integration: Expanding RA Token Accessibility',
    slug: 'raydium-dex-integration',
    summary:
      "RA token is now available for trading on Raydium, Solana's leading decentralized exchange.",
    content: [
      'We are excited to announce that RA token is now listed and actively trading on Raydium.',
      'This integration represents a significant milestone in our mission to make RA token accessible to the broader Solana ecosystem.',
      'Users can now trade RA directly on Raydium with deep liquidity pools, competitive fees, and the speed that Solana is known for.',
    ],
    category: 'Partnership',
    author: 'Solera Team',
    readTime: '4 min read',
    isPublished: true,
    publishedAt: new Date('2026-02-20'),
  },
  {
    title: 'Security Audit Complete: Solera Smart Contracts Verified',
    slug: 'security-audit-complete',
    summary:
      'Leading blockchain security firm completes comprehensive audit of all Solera smart contracts with zero critical findings.',
    content: [
      'Security is paramount in DeFi, and at Solera, we take this responsibility seriously.',
      'We are proud to announce that our comprehensive smart contract audit has been completed with zero critical findings.',
      'The audit covered all aspects of our platform including the staking contracts, Swap Node infrastructure, and reward distribution mechanisms.',
    ],
    category: 'Security',
    author: 'Solera Team',
    readTime: '6 min read',
    isPublished: true,
    publishedAt: new Date('2026-02-15'),
  },
  {
    title: 'Staking Rewards Explained: How APR is Calculated on Solera',
    slug: 'staking-rewards-explained',
    summary:
      'A transparent breakdown of how staking rewards and APR calculations work across different lock-up periods.',
    content: [
      'Understanding how your staking rewards are calculated is essential for making informed decisions on the Solera platform.',
      'In this guide, we break down the mechanics behind our APR calculations and explain how lock-up periods affect your returns.',
      'Our reward system is designed to incentivize longer commitment periods while still providing attractive returns for short-term stakers.',
    ],
    category: 'Education',
    author: 'Solera Team',
    readTime: '7 min read',
    isPublished: true,
    publishedAt: new Date('2026-02-10'),
  },
  {
    title: 'Community Governance: Shaping the Future of Solera Together',
    slug: 'community-governance',
    summary:
      'Introducing our governance framework that empowers RA token holders to participate in protocol decisions.',
    content: [
      'The launch of Solera governance marks an important step in our journey toward full decentralization.',
      'RA token holders can now participate in key protocol decisions, from fee structures to new token listings.',
      'Our governance model is designed to be inclusive, transparent, and efficient, ensuring that every voice in the community is heard.',
    ],
    category: 'Governance',
    author: 'Solera Team',
    readTime: '5 min read',
    isPublished: true,
    publishedAt: new Date('2026-02-05'),
  },
];

const getSampleNewsItems = (): NewsSeedInput[] => [
  {
    title: 'Bitcoin Breaks Key Resistance as Institutional Demand Rises',
    source: 'CoinDesk',
    tags: ['BTC'],
    body: 'Institutional inflows and strong derivatives positioning pushed Bitcoin above key resistance levels. Traders are now watching follow-through volume and macro catalysts.',
    articleUrl: 'https://www.coindesk.com/',
    isActive: true,
    upvotes: 84,
    downvotes: 7,
  },
  {
    title: 'Ethereum Fees Continue to Cool Following Latest Network Optimizations',
    source: 'The Block',
    tags: ['ETH'],
    body: 'Post-upgrade network efficiency improvements are reducing average transaction costs. Builders report better throughput consistency in peak usage windows.',
    articleUrl: 'https://www.theblock.co/',
    isActive: true,
    upvotes: 56,
    downvotes: 4,
  },
  {
    title: 'Solana Ecosystem Growth Accelerates with Strong DeFi Activity',
    source: 'Blockworks',
    tags: ['SOL', 'DEFI'],
    body: 'Solana-based protocols continue to record healthy user activity and TVL expansion, supported by improved liquidity routing and lower execution costs.',
    articleUrl: 'https://blockworks.co/',
    isActive: true,
    upvotes: 73,
    downvotes: 6,
  },
  {
    title: 'Layer 2 Competition Intensifies Across Scaling Solutions',
    source: 'Decrypt',
    tags: ['L2', 'MATIC', 'ARB'],
    body: 'Major Layer 2 ecosystems are increasing incentives and ecosystem programs, while competing on cost, UX, and cross-chain interoperability.',
    articleUrl: 'https://decrypt.co/',
    isActive: true,
    upvotes: 41,
    downvotes: 5,
  },
  {
    title: 'Stablecoin Liquidity Expands Across Major Chains',
    source: 'CryptoSlate',
    tags: ['USDT', 'USDC'],
    body: 'Cross-chain stablecoin circulation is increasing as exchanges and DeFi protocols deepen liquidity corridors for settlement and trading.',
    articleUrl: 'https://cryptoslate.com/',
    isActive: true,
    upvotes: 38,
    downvotes: 3,
  },
];

const seedAdmin = async () => {
  const walletAddress = resolveSeedAdminWalletAddress();
  if (!walletAddress) {
    console.log(
      'ℹ️ Admin seed skipped. Set SEED_ADMIN_WALLET_ADDRESS to bootstrap an admin wallet.',
    );
    return;
  }

  await prisma.adminRoleDefinition.upsert({
    where: { key: 'EDITOR' },
    update: {
      name: 'EDITOR',
      accessRole: 'EDITOR',
      isSystem: true,
      isActive: true,
    },
    create: {
      key: 'EDITOR',
      name: 'EDITOR',
      accessRole: 'EDITOR',
      isSystem: true,
      isActive: true,
    },
  });

  await prisma.adminRoleDefinition.upsert({
    where: { key: 'VIEWER' },
    update: {
      name: 'VIEWER',
      accessRole: 'VIEWER',
      isSystem: true,
      isActive: true,
    },
    create: {
      key: 'VIEWER',
      name: 'VIEWER',
      accessRole: 'VIEWER',
      isSystem: true,
      isActive: true,
    },
  });

  await prisma.adminRoleDefinition.upsert({
    where: { key: 'CUSTOM' },
    update: {
      name: 'CUSTOM',
      accessRole: 'CUSTOM',
      isSystem: true,
      isActive: true,
    },
    create: {
      key: 'CUSTOM',
      name: 'CUSTOM',
      accessRole: 'CUSTOM',
      isSystem: true,
      isActive: true,
    },
  });

  const superAdminRole = await prisma.adminRoleDefinition.upsert({
    where: { key: 'SUPER_ADMIN' },
    update: {
      name: 'SUPER_ADMIN',
      accessRole: 'SUPER_ADMIN',
      isSystem: true,
      isActive: true,
    },
    create: {
      key: 'SUPER_ADMIN',
      name: 'SUPER_ADMIN',
      accessRole: 'SUPER_ADMIN',
      isSystem: true,
      isActive: true,
    },
  });

  const admin = await prisma.admin.upsert({
    where: { walletAddress },
    update: {
      name: process.env.SEED_ADMIN_NAME?.trim() || 'Solera Admin',
      adminRoleId: superAdminRole.id,
    },
    create: {
      walletAddress,
      name: process.env.SEED_ADMIN_NAME?.trim() || 'Solera Admin',
      adminRoleId: superAdminRole.id,
    },
  });

  console.log(`✅ Admin ensured: ${admin.walletAddress}`);
};

const seedPlatformDefaults = async () => {
  await prisma.maintenanceSetting.upsert({
    where: { id: 'maintenance-settings' },
    update: {},
    create: {
      id: 'maintenance-settings',
      enabled: false,
      startsAt: null,
      message: null,
    },
  });

  await prisma.headerSetting.upsert({
    where: { id: 'header-settings' },
    update: {},
    create: {
      id: 'header-settings',
      connectEnabled: true,
      network: 'devnet',
    },
  });

  await prisma.raRuntimeSetting.upsert({
    where: { id: 'ra-runtime-settings' },
    update: {},
    create: {
      id: 'ra-runtime-settings',
    },
  });

  await prisma.proxyBackendSetting.upsert({
    where: { id: 'proxy-backend-settings' },
    update: {},
    create: {
      id: 'proxy-backend-settings',
      version: 1,
    },
  });

  await prisma.docsSetting.upsert({
    where: { id: 'docs-settings' },
    update: {},
    create: {
      id: 'docs-settings',
    },
  });

  console.log('✅ System config defaults ensured');
};

const seedSampleContent = async () => {
  const blogPosts = getSampleBlogPosts();
  for (const post of blogPosts) {
    await prisma.blogPost.upsert({
      where: { slug: post.slug },
      update: {},
      create: post,
    });
  }
  console.log(`✅ ${blogPosts.length} sample blog posts seeded`);

  const newsItems = getSampleNewsItems();
  const existingNewsCount = await prisma.newsItem.count();
  if (existingNewsCount === 0) {
    await prisma.newsItem.createMany({ data: newsItems });
    console.log(`✅ ${newsItems.length} sample news items seeded`);
    return;
  }

  console.log(`ℹ️ Sample news seed skipped (existing rows: ${existingNewsCount})`);
};

async function main() {
  console.log('🌱 Seeding database...');

  await seedAdmin();
  await seedPlatformDefaults();

  if (shouldSeedSampleContent) {
    await seedSampleContent();
  } else {
    console.log(
      'ℹ️ Sample content seed skipped. Set SEED_SAMPLE_CONTENT=true to seed demo blog/news content.',
    );
  }

  console.log('🎉 Seeding complete!');
}

main()
  .catch((error) => {
    console.error('❌ Seed error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
