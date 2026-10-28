import type { CreatedProp } from '../../shared/component-create.js';
import type { Slot } from './extract-shape.js';

export interface VariantPlan {
  prop: string;
  values: string[];
  perUse: string[];
  fallback: string;
  parts: { slot: Slot; constName: string; base: string; options: Map<string, string> }[];
}

export interface FileStyle {
  quote: string;
  semi: string;
  unit: string;
  typescript: boolean;
  cva: boolean;
}

const TITLE_TAG = /^(h[1-6]|strong|b|dt|th|legend|caption|.*Title)$/;
const DESC_TAG = /^(p|small|dd|.*Description)$/;
const LABEL_TAG = /^(a|button|label|Link|NavLink|Button|Label)$/;
const GENERIC = ['label', 'value', 'detail', 'note'];
const RESERVED = new Set(['key', 'ref', 'className', 'style', 'children', 'variant', 'class', 'default', 'new', 'delete', 'function', 'return', 'this', 'var', 'let', 'const', 'in', 'for', 'if', 'else', 'switch', 'case', 'import', 'export', 'typeof', 'void', 'with', 'while', 'do', 'try', 'catch', 'finally', 'throw', 'super', 'extends', 'enum', 'yield', 'await']);
const UTILITY = /^(?:bg|text|border|ring|from|to|via|fill|stroke|outline|shadow|decoration|divide|accent|caret|placeholder|font)-(.+)$/;

function camel(value: string): string {
  const words = value.replace(/[^A-Za-z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean);
  return words.map((word, index) => (index === 0 ? word.charAt(0).toLowerCase() + word.slice(1) : word.charAt(0).toUpperCase() + word.slice(1))).join('');
}

function textHint(slot: Slot): string | null {
  const tag = slot.tag.split('.').at(-1) ?? slot.tag;
  if (TITLE_TAG.test(tag)) return 'title';
  if (DESC_TAG.test(tag)) return 'description';
  if (LABEL_TAG.test(tag)) return 'label';
  return null;
}

function attrHint(slot: Slot): string {
  const attr = camel(slot.attr ?? 'value');
  if (!RESERVED.has(attr)) return attr;
  return camel(`${slot.tag} ${slot.attr ?? ''}`);
}

export function nameSlots(slots: Slot[], taken: Set<string>): void {
  const used = new Set(taken);
  const claim = (wanted: string): string => {
    let name = RESERVED.has(wanted) && wanted !== 'children' ? `${wanted}Value` : wanted;
    for (let index = 2; used.has(name); index += 1) name = `${wanted}${index}`;
    used.add(name);
    return name;
  };
  const textSlots = slots.filter((slot) => slot.kind === 'text');
  const onlyChild = textSlots.length === 1 && textSlots[0]?.root && textSlots[0].only ? textSlots[0] : null;
  if (onlyChild) onlyChild.name = claim('children');
  let generic = 0;
  for (const slot of slots) {
    if (slot.kind === 'class' || slot.name) continue;
    if (slot.kind === 'attr') slot.name = claim(attrHint(slot));
    else if (slot.kind === 'node') slot.name = claim(camel(slot.hint) || 'content');
    else {
      const hint = textHint(slot);
      slot.name = claim(hint && !used.has(hint) ? hint : (GENERIC[generic++] ?? `text${generic}`));
    }
  }
}

function tokens(value: string): string[] {
  return value.split(/\s+/).filter(Boolean);
}

function wordOf(token: string): string | null {
  const bare = (token.split(':').at(-1) ?? token).replace(/^[!-]+/, '');
  if (bare.includes('[')) return null;
  const match = UTILITY.exec(bare);
  const rest = (match ? (match[1] ?? '') : bare.slice(bare.indexOf('-') + 1)).replace(/\/\d+$/, '').replace(/-\d{2,3}$/, '');
  return /^[a-z][a-z0-9-]*$/.test(rest) ? rest : null;
}

function groupNames(keys: string[][]): string[] {
  const words = keys.map((diff) => [...new Set(diff.map(wordOf).filter((word): word is string => word !== null))]);
  const names: string[] = [];
  words.forEach((list, index) => {
    const others = new Set(words.filter((_, other) => other !== index).flat());
    const pick = list.find((word) => !others.has(word) && !names.includes(word)) ?? (index === 0 && !names.includes('default') ? 'default' : `option${index + 1}`);
    names.push(pick);
  });
  return names;
}

export function planVariants(slots: Slot[], uses: number, component: string): VariantPlan | null {
  const classSlots = slots.filter((slot) => slot.kind === 'class');
  if (classSlots.length === 0) return null;
  const bases = classSlots.map((slot) => {
    const lists = slot.values.map((value) => tokens(value ?? ''));
    const common = (lists[0] ?? []).filter((token) => lists.every((list) => list.includes(token)));
    return { slot, common, diffs: lists.map((list) => list.filter((token) => !common.includes(token))) };
  });
  const keyOf = (use: number) => JSON.stringify(bases.map((base) => base.diffs[use] ?? []));
  const keys: string[] = [];
  const perKey: string[][] = [];
  for (let use = 0; use < uses; use += 1) {
    const key = keyOf(use);
    if (keys.includes(key)) continue;
    keys.push(key);
    perKey.push(bases.flatMap((base) => base.diffs[use] ?? []));
  }
  const values = groupNames(perKey);
  const perUse = Array.from({ length: uses }, (_, use) => values[keys.indexOf(keyOf(use))] ?? 'default');
  const parts = bases.map((base, index) => {
    const options = new Map<string, string>();
    for (let use = 0; use < uses; use += 1) options.set(perUse[use] as string, (base.diffs[use] ?? []).join(' '));
    return { slot: base.slot, constName: `${camel(component)}${index === 0 ? '' : String(index + 1)}Variants`, base: base.common.join(' '), options };
  });
  return { prop: 'variant', values, perUse, fallback: perUse[0] ?? 'default', parts };
}

function quoted(value: string, style: FileStyle): string {
  const escaped = value.replace(/\\/g, '\\\\').split(style.quote).join(`\\${style.quote}`);
  return `${style.quote}${escaped}${style.quote}`;
}

function key(value: string, style: FileStyle): string {
  return /^[A-Za-z_$][\w$]*$/.test(value) ? value : quoted(value, style);
}

function variantConst(part: VariantPlan['parts'][number], plan: VariantPlan, style: FileStyle): string {
  const u = style.unit;
  const options = [...part.options].map(([value, classes]) => `${u.repeat(style.cva ? 3 : 1)}${key(value, style)}: ${quoted(classes, style)},`).join('\n');
  if (!style.cva) return `const ${part.constName} = {\n${options}\n}${style.typescript ? ' as const' : ''}${style.semi}`;
  return [`const ${part.constName} = cva(${quoted(part.base, style)}, {`, `${u}variants: {`, `${u}${u}${plan.prop}: {`, options, `${u}${u}},`, `${u}},`, `${u}defaultVariants: {`, `${u}${u}${plan.prop}: ${quoted(plan.fallback, style)},`, `${u}},`, `})${style.semi}`].join('\n');
}

export function classExpression(part: VariantPlan['parts'][number], plan: VariantPlan, style: FileStyle): string {
  if (style.cva) return `${part.constName}({ ${plan.prop} })`;
  return part.base ? `\`${part.base} \${${part.constName}[${plan.prop}]}\`` : `${part.constName}[${plan.prop}]`;
}

function typeOf(slot: Slot): string {
  if (slot.kind === 'node' || slot.name === 'children') return 'ReactNode';
  if (slot.typed === 'string') return 'string';
  const component = /^[A-Z]/.test(slot.tag) || slot.tag.includes('.');
  return `ComponentProps<${component ? `typeof ${slot.tag}` : `'${slot.tag}'`}>['${slot.attr ?? ''}']`;
}

export function propList(slots: Slot[], variants: VariantPlan | null): CreatedProp[] {
  const props = slots.filter((slot) => slot.kind !== 'class').map((slot) => ({ name: slot.name, type: typeOf(slot), optional: slot.values.some((value) => value === null) }));
  if (variants) props.push({ name: variants.prop, type: variants.values.map((value) => `'${value}'`).join(' | '), optional: true });
  return props;
}

function reactTypes(props: CreatedProp[], style: FileStyle): string | null {
  if (!style.typescript) return null;
  const names = ['ComponentProps', 'ReactNode'].filter((name) => props.some((prop) => prop.type.includes(name)));
  return names.length > 0 ? `import type { ${names.join(', ')} } from ${quoted('react', style)}${style.semi}` : null;
}

function propsInterface(name: string, props: CreatedProp[], variants: VariantPlan | null, style: FileStyle): string | null {
  if (!style.typescript || props.length === 0) return null;
  const root = variants?.parts[0];
  const extend = variants && style.cva && root ? ` extends VariantProps<typeof ${root.constName}>` : '';
  const lines = props
    .filter((prop) => !(extend && prop.name === variants?.prop))
    .map((prop) => {
      const type = variants && prop.name === variants.prop && root && !style.cva ? `keyof typeof ${root.constName}` : prop.type;
      return `${style.unit}${prop.name}${prop.optional ? '?' : ''}: ${type}${style.semi || ';'}`;
    });
  return `export interface ${name}Props${extend} {\n${lines.join('\n')}${lines.length > 0 ? '\n' : ''}}`;
}

function signature(name: string, props: CreatedProp[], variants: VariantPlan | null, style: FileStyle): string {
  if (props.length === 0) return `export function ${name}() {`;
  const names = props.map((prop) => (variants && prop.name === variants.prop && !style.cva ? `${prop.name} = ${quoted(variants.fallback, style)}` : prop.name));
  return `export function ${name}({ ${names.join(', ')} }${style.typescript ? `: ${name}Props` : ''}) {`;
}

export interface ComponentFileInput {
  name: string;
  imports: string[];
  body: string;
  slots: Slot[];
  variants: VariantPlan | null;
  style: FileStyle;
}

export function componentFile(input: ComponentFileInput): { code: string; props: CreatedProp[] } {
  const { name, style, variants } = input;
  const props = propList(input.slots, variants);
  const cvaImport = variants && style.cva ? `import { cva${style.typescript ? ', type VariantProps' : ''} } from ${quoted('class-variance-authority', style)}${style.semi}` : null;
  const head = [reactTypes(props, style), cvaImport, ...input.imports].filter((line): line is string => line !== null);
  const consts = variants ? variants.parts.map((part) => variantConst(part, variants, style)) : [];
  const shape = propsInterface(name, props, variants, style);
  const fn = [signature(name, props, variants, style), `${style.unit}return (`, input.body, `${style.unit})${style.semi}`, '}'].join('\n');
  const blocks = [head.join('\n'), ...consts, shape, fn].filter((block): block is string => Boolean(block));
  return { code: `${blocks.join('\n\n')}\n`, props };
}

export function reindent(text: string, from: string, to: string): string {
  return text
    .split('\n')
    .map((line, index) => {
      if (index === 0) return `${to}${line}`;
      if (line.trim() === '') return '';
      return `${to}${line.startsWith(from) ? line.slice(from.length) : line.trimStart()}`;
    })
    .join('\n');
}

function attribute(slot: Slot, value: string): string {
  if (slot.kind === 'text') return /["{}<>]/.test(value) ? `${slot.name}={${JSON.stringify(value)}}` : `${slot.name}="${value}"`;
  return `${slot.name}=${value}`;
}

export function useSite(name: string, slots: Slot[], variants: VariantPlan | null, use: number, indent: string, unit: string): string {
  const attrs: string[] = [];
  let children: string | null = null;
  for (const slot of slots) {
    if (slot.kind === 'class') continue;
    const value = slot.values[use];
    if (value === null || value === undefined) continue;
    if (slot.name === 'children') children = value;
    else attrs.push(attribute(slot, value));
  }
  const variant = variants?.perUse[use];
  if (variants && variant && variant !== variants.fallback) attrs.push(`${variants.prop}="${variant}"`);
  const close = children === null ? ' />' : `>${children}</${name}>`;
  const inline = `<${name}${attrs.map((attr) => ` ${attr}`).join('')}${close}`;
  if (inline.length + indent.length <= 100 && !inline.includes('\n')) return inline;
  const lines = attrs.map((attr) => `${indent}${unit}${attr}`).join('\n');
  return `<${name}\n${lines}\n${indent}${children === null ? '/>' : `>${children}</${name}>`}`;
}
