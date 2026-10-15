import { createHash, randomBytes } from "node:crypto";

export const RESET_TOKEN_MINUTES = 30;
export const INVITE_TOKEN_HOURS = 72;

export function createRawToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function expiresInMinutes(minutes: number, now = new Date()): Date {
  return new Date(now.getTime() + minutes * 60_000);
}
