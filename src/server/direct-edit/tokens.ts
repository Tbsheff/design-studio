import { readDesignSystemFiles } from '../design-system/sync.js';
import { DirectEditError } from './errors.js';

const VAR_CALL = /var\(\s*([^,)\s]*)/gi;
const CSS_VAR_NAME = /^--[A-Za-z0-9_-]+$/;

function tokenReferences(value: string): string[] {
  return [...value.matchAll(VAR_CALL)].map((match) => match[1] ?? '');
}

function assertValueTokens(prop: string, value: string, known: Set<string> | null): void {
  for (const name of tokenReferences(value)) {
    if (!CSS_VAR_NAME.test(name)) throw new DirectEditError('invalid_token', `${prop}: "${value}" has a var() without a valid --name`);
    if (known !== null && !known.has(name)) {
      throw new DirectEditError('unknown_token', `${prop}: ${name} is not a token of this design system`);
    }
  }
}

export function assertKnownTokens(style: Record<string, string | null | undefined> | undefined, known: Set<string> | null): void {
  for (const [prop, value] of Object.entries(style ?? {})) {
    if (typeof value === 'string') assertValueTokens(prop, value, known);
  }
}

export async function knownTokenVars(workTree: string): Promise<Set<string> | null> {
  const files = await readDesignSystemFiles(workTree);
  return files === null ? null : new Set(files.entries.map((entry) => entry.cssVar));
}
