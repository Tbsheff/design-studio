import { cssEdits, isMappedProperty } from './map.js';
import { planClassEdit, type ClassEdit, type ClassSite } from './plan.js';
import type { TailwindTheme } from './theme.js';

const KEYWORDS: Record<string, Record<string, string>> = {
  position: { relative: 'relative', absolute: 'absolute', fixed: 'fixed', sticky: 'sticky' },
  'box-sizing': { 'border-box': 'box-border', 'content-box': 'box-content' },
  'white-space': { nowrap: 'whitespace-nowrap', pre: 'whitespace-pre', 'pre-wrap': 'whitespace-pre-wrap', normal: 'whitespace-normal' },
  'overflow-x': { hidden: 'overflow-x-hidden', auto: 'overflow-x-auto', scroll: 'overflow-x-scroll', visible: 'overflow-x-visible', clip: 'overflow-x-clip' },
  'overflow-y': { hidden: 'overflow-y-hidden', auto: 'overflow-y-auto', scroll: 'overflow-y-scroll', visible: 'overflow-y-visible', clip: 'overflow-y-clip' },
};

const PREFIX: Record<string, string> = {
  'min-width': 'min-w', 'max-width': 'max-w', 'min-height': 'min-h', 'max-height': 'max-h',
  top: 'top', right: 'right', bottom: 'bottom', left: 'left', 'z-index': 'z', 'flex-grow': 'grow', 'flex-shrink': 'shrink', 'flex-basis': 'basis', order: 'order',
  'grid-template-columns': 'grid-cols', 'grid-template-rows': 'grid-rows', 'aspect-ratio': 'aspect',
};

const BORDER_STYLES = new Set(['solid', 'dashed', 'dotted', 'double', 'hidden', 'none', 'groove', 'ridge', 'inset', 'outset']);

function arbitrary(value: string): string {
  return value.trim().replace(/_/g, '\\_').replace(/"/g, "'").replace(/\s*,\s*/g, ',').replace(/\s+/g, '_');
}

function legacyClass(prop: string, value: string): string {
  const keyword = KEYWORDS[prop]?.[value];
  if (keyword) return keyword;
  const prefix = PREFIX[prop];
  if (prefix) return `${prefix}-[${arbitrary(value)}]`;
  return `[${prop}:${arbitrary(value)}]`;
}

function borderParts(value: string): Array<[string, string]> {
  if (value.trim() === 'none') return [['border-width', '0px']];
  const parts = value.trim().split(/\s+(?![^(]*\))/);
  const out: Array<[string, string]> = [];
  const color: string[] = [];
  for (const part of parts) {
    if (BORDER_STYLES.has(part)) out.push(['border-style', part]);
    else if (/^-?[\d.]+(px|rem|em)?$/.test(part)) out.push(['border-width', part]);
    else color.push(part);
  }
  if (color.length > 0) out.push(['border-color', color.join(' ')]);
  return out;
}

function blankSite(): ClassSite {
  return { segments: [{ start: 0, end: 0, text: '', editable: true, direct: true, glueStart: false, glueEnd: false, quote: '"', escape: 'jsx' }], dynamic: false, unsafe: null, create: null };
}

export function tailwindClassesFor(styles: Array<[string, string]>, theme: TailwindTheme): string[] {
  const edits: ClassEdit[] = [];
  const extra: string[] = [];
  const hasBorder = styles.some(([prop]) => prop === 'border' || /^border(-(top|right|bottom|left))?-width$/.test(prop));
  const expanded = styles
    .flatMap(([prop, value]): Array<[string, string]> => (prop === 'border' ? borderParts(value) : [[prop, value]]))
    .filter(([prop]) => hasBorder || !/^border-(top|right|bottom|left)-(style|color)$/.test(prop));
  for (const [prop, value] of expanded) {
    const mapped = isMappedProperty(prop) ? cssEdits(prop, value, theme) : null;
    if (mapped) edits.push(...mapped.map((edit) => ({ ...edit, variants: '' })));
    else extra.push(legacyClass(prop, value));
  }
  const planned = edits.length > 0 ? planClassEdit(blankSite(), edits, theme).classes : [];
  return [...planned, ...extra];
}
