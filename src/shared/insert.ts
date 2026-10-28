import type { SourceLoc, Version } from './contracts.js';
import type { ComponentOwner, PropValue } from './props.js';

export type InsertPosition = 'inside' | 'after';

export const INSERT_POSITIONS: readonly InsertPosition[] = ['inside', 'after'];
export const INSERT_TEXT_MAX = 200;

export interface InsertableComponent {
  id: string;
  name: string;
  file: string;
  folder: string;
  line: number;
  uses: number;
  children: boolean;
}

export interface InsertableList {
  components: InsertableComponent[];
  truncated: boolean;
  note: string | null;
}

export interface InsertTarget {
  source: SourceLoc | null;
  tag?: string;
  selector?: string;
  owners?: ComponentOwner[];
}

export interface InsertComponentRequest {
  component: { name: string; file?: string };
  target: InsertTarget;
  position: InsertPosition;
  props?: Record<string, PropValue>;
  text?: string;
}

export interface InsertComponentResult {
  file: string;
  version: Version | null;
  select: (SourceLoc & { tag: string })[];
  jsx: string;
  importFrom: string | null;
  importAdded: boolean;
  usedAt: SourceLoc | null;
}
