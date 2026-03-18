import { BadRequestException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { encodeBase58 } from '../common/base58';

export const normalizeWalletAddress = (walletAddress: string): string => {
  const normalized = walletAddress?.trim();
  if (!normalized) {
    throw new BadRequestException('walletAddress is required');
  }

  const isSolanaBase58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(normalized);
  if (!isSolanaBase58) {
    throw new BadRequestException('walletAddress is invalid');
  }

  return normalized;
};

export const sanitizeWalletSignature = (signature: string): string => {
  const trimmed = signature?.trim();
  if (!trimmed) {
    throw new BadRequestException('signature is required');
  }

  if (!/^[1-9A-HJ-NP-Za-km-z]+$/.test(trimmed)) {
    throw new BadRequestException('signature is invalid');
  }

  return trimmed;
};

export const normalizeIpAddress = (ipAddress: string | null): string | null => {
  if (!ipAddress) return null;

  let normalized = ipAddress.trim();
  if (!normalized) return null;

  if (normalized.startsWith('::ffff:')) {
    normalized = normalized.slice(7);
  }

  normalized = normalized.replace(/^\[|\]$/g, '');

  if (/^\d+\.\d+\.\d+\.\d+:\d+$/.test(normalized)) {
    normalized = normalized.split(':')[0] ?? normalized;
  }

  return normalized || null;
};

export const formatNumber = (
  value: number,
  options?: Intl.NumberFormatOptions,
): string =>
  new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 4,
    ...options,
  }).format(value);

export const formatDateTimeForUi = (value: Date): string =>
  value.toISOString().slice(0, 16).replace('T', ' ');

export const createExplorerActivityHash = (): string =>
  encodeBase58(randomBytes(32));
