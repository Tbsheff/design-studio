import { isAttachedApp } from './app.js';
import type { Project, SelectionContext } from './contracts.js';

export interface ElementScope {
  sourceDirectionId: string;
  file: string;
  loc: string;
  selector: string;
  tag: string;
  startLine: number;
  endLine: number;
  start: number;
  suffixLength: number;
  prefixHash: string;
  suffixHash: string;
  elementHash: string;
}

export interface ElementVariantInfo {
  groupId: string;
  label: string;
  title: string;
  directionId: string;
  file: string;
  lines: string;
  state: 'running' | 'ready' | 'unchanged' | 'rejected' | 'kept' | 'discarded';
  rejected: string | null;
}

export const TRY_VARIANTS_COMMAND = 'selection.try-variants';

export const ATTACHED_APP_VARIANTS_REASON = 'Not on attached apps: each variant copies the whole app folder.';

export function elementVariantsBlocker(project: Pick<Project, 'app'> | null, selection: readonly SelectionContext[]): string | null {
  if (isAttachedApp(project)) return ATTACHED_APP_VARIANTS_REASON;
  if (selection.length === 0) return 'Select one element first';
  if (selection.length > 1) return 'Select only one element';
  if (!selection[0]?.source) return 'This element has no source location';
  return null;
}

const NUMBER_WORDS: Record<string, number> = { two: 2, three: 3, four: 4, a: 3, some: 3, few: 3, couple: 2 };

export function elementVariantsIntent(prompt: string): number | null {
  const match = /\b(?:try|make|show|give me|generate|create|explore)\s+(?:a\s+)?(\d|two|three|four|some|few|couple)?\s*(?:of\s+)?(?:different\s+|other\s+|more\s+|new\s+)?(versions?|variants?|variations?|options?|takes)\b(?:\s+(?:of|for)\s+(?:this|that|the|it)\b)?/i.exec(prompt);
  if (!match) return null;
  const word = (match[1] ?? '').toLowerCase();
  if (!word && !/s$/i.test(match[2] ?? '')) return null;
  const count = /^\d$/.test(word) ? Number(word) : (NUMBER_WORDS[word] ?? 3);
  return Math.max(2, Math.min(4, count));
}
