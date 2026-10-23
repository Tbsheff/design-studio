import { z } from 'zod';
import { TWEAKS_MAX_CONTROLS, isSafeCssValue, type TweakControl, type TweaksFile } from '../../shared/tweaks.js';

const cssValue = z.string().trim().refine(isSafeCssValue, 'must be a plain CSS value (no ; { } < > \\ or comments, at most 200 characters)');

const base = {
  id: z
    .string()
    .regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,39}$/, 'must be 1-40 letters, digits, - or _')
    .describe('Stable id, for example accent-hue.'),
  label: z.string().trim().min(1).max(40).describe('Short label shown in the panel.'),
  group: z.string().trim().min(1).max(30).optional().describe('Optional group heading, for example Color or Layout.'),
  cssVar: z
    .string()
    .regex(/^--[A-Za-z0-9_-]{1,60}$/, 'must be a CSS custom property like --accent')
    .describe('The CSS custom property this control sets, declared in a :root rule.'),
};

const rangeSchema = z
  .object({
    ...base,
    type: z.literal('range'),
    min: z.number().finite(),
    max: z.number().finite(),
    step: z.number().positive().finite().optional(),
    unit: z.string().regex(/^[A-Za-z%]{0,6}$/, 'must be a CSS unit like px, rem, % or empty').optional(),
    default: z.number().finite(),
  })
  .strict()
  .refine((control) => control.min < control.max, 'min must be less than max')
  .refine((control) => control.default >= control.min && control.default <= control.max, 'default must be between min and max');

const colorSchema = z.object({ ...base, type: z.literal('color'), default: cssValue }).strict();

const toggleSchema = z
  .object({ ...base, type: z.literal('toggle'), on: cssValue, off: cssValue, default: z.boolean() })
  .strict()
  .refine((control) => control.on !== control.off, 'on and off must differ');

const optionSchema = z.object({ label: z.string().trim().min(1).max(40), value: cssValue }).strict();

const selectSchema = z
  .object({ ...base, type: z.literal('select'), options: z.array(optionSchema).min(2).max(12), default: cssValue })
  .strict()
  .refine((control) => new Set(control.options.map((option) => option.value)).size === control.options.length, 'option values must be unique')
  .refine((control) => control.options.some((option) => option.value === control.default), 'default must be one of the option values');

export const tweakControlSchema = z.discriminatedUnion('type', [rangeSchema, colorSchema, toggleSchema, selectSchema]);

const tweakControlsSchema = z
  .array(tweakControlSchema)
  .max(TWEAKS_MAX_CONTROLS)
  .refine((controls) => new Set(controls.map((control) => control.id)).size === controls.length, 'control ids must be unique')
  .refine((controls) => new Set(controls.map((control) => control.cssVar)).size === controls.length, 'each cssVar may have only one control');

const tweaksFileSchema = z.object({ controls: tweakControlsSchema }).strict();

export function describeZodError(error: z.ZodError): string {
  return error.issues
    .slice(0, 6)
    .map((issue) => `${issue.path.length > 0 ? issue.path.join('.') : 'controls'}: ${issue.message}`)
    .join('; ');
}

type ParsedControls = { controls: TweakControl[]; error: null } | { controls: null; error: string };

export function parseControls(raw: unknown): ParsedControls {
  const result = tweakControlsSchema.safeParse(raw);
  if (!result.success) return { controls: null, error: describeZodError(result.error) };
  return { controls: result.data as TweakControl[], error: null };
}

export function parseTweaksText(text: string): { file: TweaksFile | null; error: string | null } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    return { file: null, error: `tweaks.json is not valid JSON: ${error instanceof Error ? error.message : String(error)}` };
  }
  const result = tweaksFileSchema.safeParse(raw);
  if (!result.success) return { file: null, error: `tweaks.json is invalid: ${describeZodError(result.error)}` };
  return { file: { controls: result.data.controls as TweakControl[] }, error: null };
}
