import type { DraftSourceKind } from '../../../shared/contracts.js';

export type SourceKind = DraftSourceKind;

export type CandidateConfidence = 'high' | 'medium';

export interface Candidate {
  token: string;
  value?: string;
  dark?: string;
  source: SourceKind;
  confidence: CandidateConfidence;
  evidence: string;
  canonical?: boolean;
  verified?: boolean;
  sourceVar?: string;
}

export interface ExtraToken {
  group: string;
  name: string;
  type: 'color' | 'dimension' | 'fontFamily' | 'shadow';
  value: string;
  dark?: string;
  evidence: string;
  sourceVar?: string;
}

export interface Harvest {
  source: SourceKind;
  label: string;
  candidates: Candidate[];
  extras?: ExtraToken[];
  googleFontsUrl?: string;
  darkHint?: boolean;
}

export type {
  CoverageConfidence,
  CoverageEntry,
  CoverageGrade,
  DesignSystemCoverage as Coverage,
  DraftSourceReport as SourceReport,
} from '../../../shared/contracts.js';
