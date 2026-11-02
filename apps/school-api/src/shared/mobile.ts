import { applyDecorators } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { Matches } from 'class-validator';

export const MOBILE_PATTERN = /^[6-9]\d{9}$/;

export function normalizeMobile(value: unknown): unknown {
  if (typeof value !== 'string' && typeof value !== 'number') return value;
  const digits = String(value)
    .replace(/[\s()-]/g, '')
    .replace(/^\+/, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits;
}

export function maskMobile(mobile: string): string {
  return mobile.length === 10 ? `${mobile.slice(0, 2)}******${mobile.slice(-2)}` : mobile;
}

export function IsMobile(description = '10-digit Indian mobile number. +91, spaces and dashes are removed.') {
  return applyDecorators(
    ApiProperty({ example: '9876543210', description }),
    Transform(({ value }) => normalizeMobile(value)),
    Matches(MOBILE_PATTERN, { message: 'mobile must be a valid 10-digit Indian mobile number' }),
  );
}
