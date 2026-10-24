export type SourceKind = 'tokens-file' | 'folder' | 'url' | 'design-md' | 'brief';

export type CandidateConfidence = 'high' | 'medium';

export interface Candidate {
  token: string;
  value?: string;
  dark?: string;
  source: SourceKind;
  confidence: CandidateConfidence;
  evidence: string;
}

export interface Harvest {
  source: SourceKind;
  label: string;
  candidates: Candidate[];
  googleFontsUrl?: string;
  darkHint?: boolean;
}

export interface SourceReport {
  kind: SourceKind | 'images';
  label: string;
  ok: boolean;
  found: number;
  error?: string;
}

export type CoverageConfidence = 'high' | 'medium' | 'fallback';

export interface CoverageEntry {
  token: string;
  source: SourceKind | 'derived' | 'base';
  confidence: CoverageConfidence;
  evidence: string;
}

export type CoverageGrade = 'excellent' | 'usable' | 'needs-review' | 'rebuild';

export interface Coverage {
  version: 1;
  score: number;
  grade: CoverageGrade;
  basePackId: string;
  mode: 'light' | 'dark';
  tokens: CoverageEntry[];
  fallbacks: string[];
  sources: SourceReport[];
}
