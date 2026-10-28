import { z } from 'zod';
import { DIRECT_STYLE_PROPERTIES, INSERT_KINDS, STRUCTURE_OPS } from '../../shared/contracts.js';
import type { DirectEditBatch, DirectEditRequest, StructureEditRequest } from '../../shared/contracts.js';
import { CLASS_NAME, MAX_CLASS_NAME, MAX_CLASS_NAMES } from './classes.js';
import { DirectEditError } from './errors.js';

const MAX_VALUE = 200;
const MAX_TEXT = 5000;
const UNSAFE_VALUE = /[;{}<>\\\u0000-\u001f\u007f]/;
const SCRIPT_URL = /javascript\s*:|expression\s*\(/i;
const MAX_NAME = 60;
const UNSAFE_NAME = /["'`<>{}&\\\u0000-\u001f\u007f]/;
const COMPONENT_NAME = /^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)*$/;

const styleValueSchema = z
  .string()
  .max(MAX_VALUE)
  .refine((value) => value.trim() !== '', 'value must not be empty')
  .refine((value) => !UNSAFE_VALUE.test(value), 'value has a character that is not allowed')
  .refine((value) => !SCRIPT_URL.test(value), 'value has a script URL')
  .nullable();

const styleSchema = z
  .object(Object.fromEntries(DIRECT_STYLE_PROPERTIES.map((prop) => [prop, styleValueSchema])))
  .partial()
  .strict();

const nameSchema = z
  .string()
  .min(1)
  .max(MAX_NAME)
  .refine((value) => value.trim() === value && value !== '', 'name must not start or end with a space')
  .refine((value) => !UNSAFE_NAME.test(value), 'name has a character that is not allowed')
  .nullable();

const classList = z.array(z.string().min(1).max(MAX_CLASS_NAME).regex(CLASS_NAME, 'class name has a character that is not allowed')).max(MAX_CLASS_NAMES);
const classesSchema = z.object({ add: classList.optional(), remove: classList.optional() }).strict();
const hasClasses = (classes: { add?: string[]; remove?: string[] } | undefined) => (classes?.add?.length ?? 0) + (classes?.remove?.length ?? 0) > 0;

const requestSchema = z
  .object({
    source: z
      .object({
        file: z.string().min(1).max(1024),
        line: z.number().int().min(1),
        col: z.number().int().min(1),
      })
      .strict(),
    selector: z.string().max(2000),
    tag: z.string().max(100).regex(/^[a-z][a-z0-9-]*$/, 'tag must be a lowercase tag name').optional(),
    style: styleSchema.optional(),
    text: z.string().max(MAX_TEXT).optional(),
    name: nameSchema.optional(),
    move: z.enum(['up', 'down']).optional(),
    insert: z.enum(INSERT_KINDS).optional(),
    classes: classesSchema.optional(),
    component: z.string().max(100).regex(COMPONENT_NAME, 'component must be a component name such as Button').optional(),
  })
  .strict()
  .refine((request) => request.component === undefined || (request.name === undefined && request.move === undefined && request.insert === undefined), 'a component use takes style, classes and text only')
  .refine(
    (request) => request.text !== undefined || request.name !== undefined || request.move !== undefined || request.insert !== undefined || hasClasses(request.classes) || Object.keys(request.style ?? {}).length > 0,
    'style, text, classes, name, move or insert is required',
  )
  .refine(
    (request) => request.insert === undefined || (request.move === undefined && request.text === undefined && request.name === undefined && request.style === undefined && request.classes === undefined),
    'insert must be the only change',
  )
  .refine(
    (request) => request.move === undefined || (request.text === undefined && request.name === undefined && request.style === undefined && request.classes === undefined),
    'move must be the only change',
  );

export function parseDirectEditRequest(raw: unknown): DirectEditRequest {
  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success) {
    const detail = parsed.error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`).join('; ');
    throw new DirectEditError('invalid_request', `Invalid direct edit: ${detail}`);
  }
  const request: DirectEditRequest = { source: parsed.data.source, selector: parsed.data.selector };
  if (parsed.data.tag !== undefined) request.tag = parsed.data.tag;
  if (parsed.data.style !== undefined) {
    const style: Record<string, string | null> = {};
    for (const [prop, value] of Object.entries(parsed.data.style)) if (value !== undefined) style[prop] = value;
    request.style = style;
  }
  if (parsed.data.text !== undefined) request.text = parsed.data.text;
  if (parsed.data.name !== undefined) request.name = parsed.data.name;
  if (parsed.data.move !== undefined) request.move = parsed.data.move;
  if (parsed.data.insert !== undefined) request.insert = parsed.data.insert;
  if (hasClasses(parsed.data.classes)) request.classes = parsed.data.classes;
  if (parsed.data.component !== undefined) request.component = parsed.data.component;
  return request;
}

const MAX_BATCH = 50;
const batchSchema = z.object({ edits: z.array(z.unknown()).min(1).max(MAX_BATCH) }).strict();

export function isDirectEditBatch(raw: unknown): boolean {
  return typeof raw === 'object' && raw !== null && 'edits' in raw;
}

export function parseDirectEditBatch(raw: unknown): DirectEditBatch {
  const parsed = batchSchema.safeParse(raw);
  if (!parsed.success) {
    throw new DirectEditError('invalid_request', `Invalid direct edit batch: send 1 to ${MAX_BATCH} edits`);
  }
  const edits = parsed.data.edits.map((entry, index) => {
    let request: DirectEditRequest;
    try {
      request = parseDirectEditRequest(entry);
    } catch (error) {
      if (error instanceof DirectEditError) throw new DirectEditError('invalid_request', `Edit ${index + 1}: ${error.message}`);
      throw error;
    }
    if (request.name !== undefined || request.move !== undefined || request.insert !== undefined) {
      throw new DirectEditError('invalid_request', `Edit ${index + 1}: a batch can only change style, text and classes`);
    }
    return request;
  });
  return { edits };
}

const structureTargetSchema = z
  .object({
    source: z.object({ file: z.string().min(1).max(1024), line: z.number().int().min(1), col: z.number().int().min(1) }).strict(),
    selector: z.string().max(2000).optional(),
    tag: z.string().max(100).regex(/^[a-z][a-z0-9-]*$/, 'tag must be a lowercase tag name').optional(),
  })
  .strict();

const structureSchema = z
  .object({
    op: z.enum(STRUCTURE_OPS),
    targets: z.array(structureTargetSchema).min(1).max(MAX_BATCH),
    into: structureTargetSchema.optional(),
    before: structureTargetSchema.optional(),
    after: structureTargetSchema.optional(),
  })
  .strict()
  .refine((request) => [request.into, request.before, request.after].filter(Boolean).length === (request.op === 'move' ? 1 : 0), 'move needs exactly one of into, before or after; other ops take none');

export function isStructureEdit(raw: unknown): boolean {
  return typeof raw === 'object' && raw !== null && 'op' in raw;
}

export function parseStructureEdit(raw: unknown): StructureEditRequest {
  const parsed = structureSchema.safeParse(raw);
  if (!parsed.success) {
    const detail = parsed.error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`).join('; ');
    throw new DirectEditError('invalid_request', `Invalid structure edit: ${detail}`);
  }
  return parsed.data;
}
