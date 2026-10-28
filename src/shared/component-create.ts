import type { SourceLoc, Version } from './contracts.js';
import type { InsertTarget } from './insert.js';

export const CREATE_TARGETS_MAX = 24;
export const COMPONENT_NAME = /^[A-Z][A-Za-z0-9]{0,63}$/;

export interface CreateComponentRequest {
  targets: InsertTarget[];
  name: string;
  folder: string;
}

export interface CreatedProp {
  name: string;
  type: string;
  optional: boolean;
}

export interface CreateComponentResult {
  file: string;
  name: string;
  version: Version | null;
  title: string;
  props: CreatedProp[];
  variants: string[];
  files: string[];
  select: (SourceLoc & { tag: string })[];
  importFrom: string[];
}

export interface ComponentFolder {
  folder: string;
  kind: 'kit' | 'app';
  label: string;
}

export interface ComponentFolderList {
  folders: ComponentFolder[];
  note: string | null;
}

export interface SwapRequest {
  use: SourceLoc;
  component: { name: string; file?: string };
}

export interface SwapCandidate {
  name: string;
  file: string;
  keep: string[];
  drop: string[];
  add: string[];
}

export interface SwapCandidateList {
  from: string;
  candidates: SwapCandidate[];
  note: string | null;
}

export interface SwapResult {
  file: string;
  version: Version | null;
  title: string;
  dropped: string[];
  added: string[];
  importFrom: string;
  select: (SourceLoc & { tag: string })[];
}
