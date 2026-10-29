import type { FinalCheck } from './contracts.js';

export const REFERENCE_NAME_PREFIX = 'reference--';
export const REFERENCE_LOW_SCORE = 80;
export const REFERENCE_MAX_WIDTH = 1920;

export function isReferenceName(name: string): boolean {
  return name.startsWith(REFERENCE_NAME_PREFIX);
}

export function asReferenceName(name: string): string {
  return isReferenceName(name) ? name : `${REFERENCE_NAME_PREFIX}${name}`;
}

export function plainAttachmentName(name: string): string {
  return isReferenceName(name) ? name.slice(REFERENCE_NAME_PREFIX.length) : name;
}

export interface ReferenceRegion {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  differsPct: number;
  contentDiffersPct: number;
  edgeMatchPct: number;
}

export interface ReferenceScore {
  score: number;
  contentScore: number;
  edgeScore: number;
  width: number;
  height: number;
  differsPct: number;
  regions: ReferenceRegion[];
  diffPath: string;
  renderPath: string;
  ms: number;
}

export interface ReferenceRecord {
  score: number | null;
  fixLoop: boolean;
  before?: number;
  diffPath?: string;
  name?: string;
  error?: string;
}

export type FinalCheckWithReference = FinalCheck & { reference?: ReferenceRecord };
