import type { AppCandidate } from '../../shared/contracts.js';

export class NotFoundError extends Error {
  readonly status = 404;
}

export class BadRequestError extends Error {
  readonly status = 400;
}

export class ConflictError extends Error {
  readonly status = 409;
}

export class PickAppError extends ConflictError {
  constructor(readonly candidates: AppCandidate[]) {
    super(`This folder has ${candidates.length} Next.js apps. Pick one: ${candidates.map((candidate) => candidate.appDir).join(', ')}.`);
  }
}

const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;

export function assertSafeId(value: string, label: string): string {
  if (!SAFE_ID.test(value)) throw new BadRequestError(`invalid ${label}`);
  return value;
}

export function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}
