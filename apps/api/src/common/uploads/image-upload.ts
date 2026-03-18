import { BadRequestException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import type { Express } from 'express';

export const MAX_IMAGE_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
export const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
]);

export const IMAGE_EXTENSION_BY_MIME: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const hasMagicBytes = (buffer: Buffer, mimeType: string): boolean => {
  if (mimeType === 'image/png') {
    if (buffer.length < 8) return false;
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    );
  }

  if (mimeType === 'image/jpeg') {
    if (buffer.length < 3) return false;
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  if (mimeType === 'image/gif') {
    if (buffer.length < 6) return false;
    const header = buffer.subarray(0, 6).toString('ascii');
    return header === 'GIF87a' || header === 'GIF89a';
  }

  if (mimeType === 'image/webp') {
    if (buffer.length < 12) return false;
    const riff = buffer.subarray(0, 4).toString('ascii');
    const webp = buffer.subarray(8, 12).toString('ascii');
    return riff === 'RIFF' && webp === 'WEBP';
  }

  return false;
};

export const validateImageUpload = (file: Express.Multer.File): string => {
  if (!file) {
    throw new BadRequestException('No file uploaded');
  }

  const normalizedMimeType = file.mimetype.toLowerCase();
  const extension = IMAGE_EXTENSION_BY_MIME[normalizedMimeType];

  if (!ALLOWED_IMAGE_MIME_TYPES.has(normalizedMimeType) || !extension) {
    throw new BadRequestException(
      'Only PNG, JPG, WEBP and GIF files are allowed.',
    );
  }

  if (!hasMagicBytes(file.buffer, normalizedMimeType)) {
    throw new BadRequestException('Invalid image file content.');
  }

  return extension;
};

export const persistImageUpload = async ({
  file,
  uploadDir,
  publicPathPrefix,
  fileNamePrefix,
}: {
  file: Express.Multer.File;
  uploadDir: string;
  publicPathPrefix: string;
  fileNamePrefix: string;
}) => {
  const extension = validateImageUpload(file);
  await fs.mkdir(uploadDir, { recursive: true });

  const fileName = `${fileNamePrefix}-${Date.now()}-${randomBytes(8).toString('hex')}${extension}`;
  const filePath = join(uploadDir, fileName);

  await fs.writeFile(filePath, file.buffer, { flag: 'wx' });

  return { url: `${publicPathPrefix}/${fileName}` };
};
