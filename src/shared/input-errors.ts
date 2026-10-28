import type { z } from 'zod';

interface Def {
  type: string;
  innerType?: z.ZodType;
  in?: z.ZodType;
  out?: z.ZodType;
  element?: z.ZodType;
  options?: z.ZodType[];
  entries?: Record<string, unknown>;
  values?: unknown[];
  shape?: Record<string, z.ZodType>;
}

const WRAPPERS = new Set(['optional', 'nullable', 'default', 'prefault', 'readonly', 'catch', 'nonoptional']);
const MAX_ISSUES = 3;

function defOf(schema: z.ZodType): Def {
  return (schema as unknown as { _zod: { def: Def } })._zod.def;
}

function unwrap(schema: z.ZodType): z.ZodType {
  let current = schema;
  for (let step = 0; step < 8; step += 1) {
    const def = defOf(current);
    if (WRAPPERS.has(def.type) && def.innerType) current = def.innerType;
    else if (def.type === 'pipe' && def.in && def.out) current = defOf(def.out).type === 'transform' ? def.in : def.out;
    else return current;
  }
  return current;
}

function isOptional(schema: z.ZodType): boolean {
  return (schema as unknown as { _zod: { optin?: string } })._zod.optin === 'optional';
}

function objectShape(schema: z.ZodType): Record<string, z.ZodType> | null {
  const shape = (schema as unknown as { shape?: Record<string, z.ZodType> }).shape;
  return defOf(schema).type === 'object' && shape ? shape : null;
}

function describeObject(shape: Record<string, z.ZodType>, depth: number): string {
  if (depth > 1) return 'object';
  const fields = Object.entries(shape).map(([key, value]) => `"${key}"${isOptional(value) ? '?' : ''}: ${describe(value, depth + 1)}`);
  return `{${fields.join(', ')}}`;
}

function describe(schema: z.ZodType, depth = 0): string {
  const inner = unwrap(schema);
  const def = defOf(inner);
  const shape = objectShape(inner);
  if (shape) return describeObject(shape, depth);
  if (def.type === 'array' && def.element) return `[${describe(def.element, depth + 1)}, ...]`;
  if (def.type === 'enum' && def.entries) return Object.values(def.entries).map((value) => JSON.stringify(value)).join(' | ');
  if (def.type === 'literal' && def.values) return def.values.map((value) => JSON.stringify(value)).join(' | ');
  if (def.type === 'union' && def.options) return def.options.map((option) => describe(option, depth + 1)).join(' | ');
  return def.type;
}

function schemaAt(schema: z.ZodType, path: readonly PropertyKey[]): z.ZodType | null {
  let current: z.ZodType | null = schema;
  for (const key of path) {
    if (!current) return null;
    const inner = unwrap(current);
    const def = defOf(inner);
    const shape = objectShape(inner);
    if (shape) current = shape[String(key)] ?? null;
    else if (def.type === 'array' && def.element) current = def.element;
    else return null;
  }
  return current;
}

function issueText(schema: z.ZodType, issue: z.core.$ZodIssue): string {
  const field = issue.path.map(String).join('.') || 'input';
  const missing = issue.code === 'invalid_type' && /received undefined/.test(issue.message);
  const node = schemaAt(schema, issue.path);
  const keys = node && issue.path.length === 0 ? objectShape(unwrap(node)) : null;
  if (keys && issue.code === 'unrecognized_keys') return `${issue.message}. Allowed keys: ${Object.keys(keys).join(', ')}`;
  const shape = node && (issue.code === 'invalid_type' || issue.code === 'unrecognized_keys' || issue.code === 'invalid_union') ? describe(node) : null;
  if (missing) return `${field} is required${shape ? `, as ${shape}` : ''}`;
  return `${field}: ${issue.message.replace(/^Invalid input: /, '')}${shape ? `. Expected ${field} as ${shape}` : ''}`;
}

export function inputIssues(schema: z.ZodType, error: z.ZodError): string {
  const shown = error.issues.slice(0, MAX_ISSUES).map((issue) => issueText(schema, issue));
  const more = error.issues.length - shown.length;
  return `${shown.join('; ')}${more > 0 ? `; and ${more} more` : ''}`;
}
