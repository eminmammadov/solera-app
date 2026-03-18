import { BadRequestException } from '@nestjs/common';
import type { Express } from 'express';

export interface AuthenticatedAdminRequest extends Express.Request {
  user?: {
    walletAddress?: string;
  };
}

export const resolveStakingNetwork = (
  network?: 'devnet' | 'mainnet',
): 'devnet' | 'mainnet' | undefined => {
  if (network === 'mainnet') {
    return 'mainnet';
  }

  if (network === 'devnet') {
    return 'devnet';
  }

  return undefined;
};

export const assertAuthenticatedAdminWallet = (
  request: AuthenticatedAdminRequest | undefined,
  walletAddress: string | undefined,
  message: string,
) => {
  if (walletAddress && request?.user?.walletAddress !== walletAddress) {
    throw new BadRequestException(message);
  }
};
