import { z } from 'zod';
import { DIRECT_STYLE_PROPERTIES } from '../../shared/contracts.js';
import type { DirectEditRequest } from '../../shared/contracts.js';
import { DirectEditError } from './errors.js';

const MAX_VALUE = 200;
const MAX_TEXT = 5000;
const UNSAFE_VALUE = /[;{}<>\\\u0000-\u001f\u007f]/;
const SCRIPT_URL = /javascript\s*:|expression\s*\(/i;

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
  })
  .strict()
  .refine((request) => request.text !== undefined || Object.keys(request.style ?? {}).length > 0, 'style or text is required');

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
  return request;
}
