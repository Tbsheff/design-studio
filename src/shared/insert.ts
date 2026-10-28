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

export type JsxInsertPosition = 'inside' | 'before' | 'after' | 'replace';

export const JSX_INSERT_POSITIONS: readonly JsxInsertPosition[] = ['inside', 'before', 'after', 'replace'];
export const JSX_SNIPPET_MAX = 20000;
export const JSX_IMPORTS_MAX = 40;

export interface InsertJsxRequest {
  target: InsertTarget;
  position: JsxInsertPosition;
  jsx: string;
  imports?: Record<string, string>;
}

export interface InsertJsxImport {
  name: string;
  specifier: string;
  added: boolean;
}

export interface InsertJsxResult {
  file: string;
  version: Version | null;
  select: (SourceLoc & { tag: string })[];
  imports: InsertJsxImport[];
  usedAt: SourceLoc | null;
  title: string;
}
