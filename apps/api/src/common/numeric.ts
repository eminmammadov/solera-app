import { Prisma } from '@prisma/client';

export type NumericLike = Prisma.Decimal | number | string | null | undefined;

export const isPrismaDecimal = (value: unknown): value is Prisma.Decimal =>
  value instanceof Prisma.Decimal;

export const toNumber = (value: NumericLike, fallback = 0): number => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  if (isPrismaDecimal(value)) {
    const parsed = value.toNumber();
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

export const toNullableNumber = (value: NumericLike): number | null => {
  if (value === null || value === undefined) return null;
  return toNumber(value);
};

export const normalizeNumericResultDeep = <T>(value: T): T => {
  if (isPrismaDecimal(value)) {
    return toNumber(value) as T;
  }

  if (Array.isArray(value)) {
    const normalizedArray: unknown[] = [];
    for (const entry of value) {
      normalizedArray.push(normalizeNumericResultDeep<unknown>(entry));
    }
    return normalizedArray as T;
  }

  if (value instanceof Date || value === null || typeof value !== 'object') {
    return value;
  }

  const normalizedEntries = Object.entries(
    value as Record<string, unknown>,
  ).map(([key, entry]) => [key, normalizeNumericResultDeep(entry)]);
  return Object.fromEntries(normalizedEntries) as unknown as T;
};
