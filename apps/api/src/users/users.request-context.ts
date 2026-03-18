import type { Request } from 'express';
import type { UsersRequestContext } from './users.types';

const getHeaderValue = (
  value: string | string[] | undefined,
): string | null => {
  if (!value) return null;
  if (Array.isArray(value)) {
    return value[0]?.trim() || null;
  }
  const trimmed = value.trim();
  return trimmed || null;
};

const resolveRequesterIp = (req: Request): string | null => {
  const proxyIp = getHeaderValue(req.headers['x-solera-client-ip']);
  if (proxyIp) return proxyIp;

  const reqIp = req.ip?.trim();
  if (reqIp) return reqIp;

  const socketIp = req.socket?.remoteAddress?.trim();
  if (socketIp) return socketIp;

  return null;
};

const resolveCountryCode = (req: Request): string | null => {
  const candidates = [
    getHeaderValue(req.headers['x-solera-country-code']),
    getHeaderValue(req.headers['x-vercel-ip-country']),
    getHeaderValue(req.headers['cf-ipcountry']),
    getHeaderValue(req.headers['x-country-code']),
    getHeaderValue(req.headers['x-geo-country']),
  ];

  for (const candidate of candidates) {
    if (candidate && /^[A-Za-z]{2}$/.test(candidate)) {
      return candidate.toUpperCase();
    }
  }

  return null;
};

export const buildUsersRequestContext = (
  req?: Request,
): UsersRequestContext => {
  if (!req) {
    return {
      requesterKey: 'unknown',
      ipAddress: null,
      countryCode: null,
      userAgent: null,
    };
  }

  const ipAddress = resolveRequesterIp(req);
  const countryCode = resolveCountryCode(req);
  const userAgent = getHeaderValue(req.headers['user-agent']);

  return {
    requesterKey: ipAddress ?? 'unknown',
    ipAddress,
    countryCode,
    userAgent,
  };
};
