import { getRateLimitRuntimeStatus } from '../common/rate-limit-store';

export interface MaintenanceStatus {
  maintenanceEnabled: boolean;
  maintenanceStartsAt: string | null;
  maintenanceMessage: string | null;
  isActive: boolean;
  serverTime: string;
}

export interface HeaderSettingsPayload {
  logoUrl: string;
  projectName: string;
  description: string;
  network: 'devnet' | 'mainnet';
  connectEnabled: boolean;
  navLinks: Array<{ name: string; href: string }>;
  updatedAt: string;
}

export interface RaSettingsPayload {
  logoUrl: string;
  tokenSymbol: string;
  tokenName: string;
  mintDevnet: string;
  mintMainnet: string;
  treasuryDevnet: string;
  treasuryMainnet: string;
  oraclePrimary: 'DEXSCREENER' | 'RAYDIUM';
  oracleSecondary: 'DEXSCREENER' | 'RAYDIUM' | null;
  stakeFeeBps: number;
  claimFeeBps: number;
  stakeMinUsd: number;
  stakeMaxUsd: number;
  convertMinUsd: number;
  convertMaxUsd: number;
  convertEnabled: boolean;
  convertProvider: 'RAYDIUM' | 'JUPITER';
  convertExecutionMode: 'AUTO' | 'SINGLE_TX_ONLY' | 'ALLOW_MULTI_TX';
  convertRoutePolicy: 'TOKEN_TO_SOL_TO_RA';
  convertSlippageBps: number;
  convertMaxTokensPerSession: number;
  convertPoolIdDevnet: string;
  convertPoolIdMainnet: string;
  convertQuoteMintDevnet: string;
  convertQuoteMintMainnet: string;
  updatedAt: string;
}

export interface RaMigrationPayload {
  updatedStakeRows: number;
  updatedActivityRows: number;
  modelVersion: number;
  migratedAt: string;
}

export interface ProxyBackendConfigPayload {
  draftBackendBaseUrl: string | null;
  publishedBackendBaseUrl: string | null;
  previousBackendBaseUrl: string | null;
  effectiveBackendBaseUrl: string | null;
  version: number;
  updatedAt: string;
}

export interface InfraRuntimeStatusPayload {
  rateLimit: ReturnType<typeof getRateLimitRuntimeStatus>;
  proxy: {
    sharedKeyConfigured: boolean;
    allowDevFallbacks: boolean;
  };
  generatedAt: string;
}

export interface AdminMetricsPayload {
  generatedAt: string;
  users: {
    total: number;
    blocked: number;
    online: number;
    active24h: number;
    totalStakePositions: number;
    activeStakePositions: number;
    totalStakedAmountUsd: number;
    averageSessionSeconds: number;
    topCountries: Array<{ country: string; users: number }>;
  };
  content: {
    blogTotal: number;
    blogPublished: number;
    blogDraft: number;
    newsTotal: number;
    newsActive: number;
    newsInactive: number;
    newsUpvotes: number;
    newsDownvotes: number;
    docsCategories: number;
    docsPages: number;
    docsSections: number;
  };
  market: {
    tokensTotal: number;
    tokensActive: number;
  };
  system: {
    maintenanceEnabled: boolean;
    maintenanceActive: boolean;
    connectEnabled: boolean;
    headerNetwork: 'devnet' | 'mainnet';
    rateLimitRedisConfigured: boolean;
    rateLimitConfiguredBackend: 'memory' | 'redis';
    rateLimitEffectiveBackend: 'memory' | 'redis';
    rateLimitDegraded: boolean;
    rateLimitLastFallbackAt: string | null;
    rateLimitLastErrorMessage: string | null;
    proxySharedKeyConfigured: boolean;
    proxyAllowDevFallbacks: boolean;
  };
}
