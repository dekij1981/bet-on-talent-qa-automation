import dotenv from 'dotenv';
import path from 'node:path';

// Single place where environment variables are read. Defaults live here and in .env.example.
dotenv.config({ path: path.resolve(process.cwd(), '.env'), quiet: true });

function readString(name: string, fallback: string): string {
  const value = process.env[name]?.trim();
  return value ? value : fallback;
}

function readInt(name: string, fallback: number, min: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;

  const value = Number(raw);
  if (!Number.isInteger(value) || value < min) {
    throw new Error(`${name} must be an integer >= ${min}, got "${raw}"`);
  }
  return value;
}

const isCI = Boolean(process.env.CI);

export const env = {
  isCI,
  baseUrl: readString('BASE_URL', 'https://automationexercise.com'),
  workers: readInt('WORKERS', 2, 1),
  retries: readInt('RETRIES', isCI ? 2 : 0, 0),

  // example.com is reserved for documentation (RFC 2606), so no real mailbox is ever used.
  emailDomain: readString('TEST_EMAIL_DOMAIN', 'example.com'),
  userPassword: readString('TEST_USER_PASSWORD', 'QaPassword123!'),
} as const;

export { readInt, readString };
