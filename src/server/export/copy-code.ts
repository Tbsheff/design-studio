import { SOURCE_LOC_ATTR } from '../../shared/contracts.js';
import type { CopyCodeFormat, ExportFrame } from '../../shared/export.js';
import { BadRequestError } from '../store/errors.js';
import type { PreviewService } from '../types.js';
import { waitForPage } from './capture.js';
import { withPagePath } from './source.js';

interface StyledNode {
  tag: string;
  attrs: [string, string][];
  styles: [string, string][];
  children: (StyledNode | string)[];
  raw?: string;
}

const INHERITED = [
  'color', 'font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing', 'text-align', 'text-transform',
  'white-space', 'word-spacing', 'font-variant-numeric', 'font-feature-settings', 'text-wrap', 'list-style-type', 'cursor', 'visibility',
];
const OWN = [
  'display', 'position', 'top', 'right', 'bottom', 'left', 'z-index', 'box-sizing',
  'flex-direction', 'flex-wrap', 'align-items', 'align-content', 'align-self', 'justify-content', 'justify-items', 'justify-self', 'flex-grow', 'flex-shrink', 'flex-basis', 'order',
  'grid-template-columns', 'grid-template-rows', 'grid-column', 'grid-row', 'grid-auto-flow', 'row-gap', 'column-gap',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'min-width', 'max-width', 'min-height', 'max-height', 'aspect-ratio', 'overflow-x', 'overflow-y',
  'background-color', 'background-image', 'background-size', 'background-position', 'background-repeat',
  'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width', 'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style',
  'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
  'border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius',
  'box-shadow', 'opacity', 'transform', 'filter', 'backdrop-filter', 'object-fit', 'object-position', 'text-decoration-line', 'text-decoration-color', 'text-overflow', 'vertical-align', 'outline-style', 'outline-width', 'outline-color', 'outline-offset', 'mix-blend-mode', 'transition',
];

function collectExpression(selector: string): string {
  return `(() => {
  const INHERITED = ${JSON.stringify(INHERITED)};
  const OWN = ${JSON.stringify(OWN)};
  const LOC = ${JSON.stringify(SOURCE_LOC_ATTR)};
  const root = document.querySelector(${JSON.stringify(selector)});
  if (!root) return null;
  const sandbox = document.createElement('iframe');
  sandbox.style.cssText = 'position:absolute;width:0;height:0;border:0;visibility:hidden';
  document.body.appendChild(sandbox);
  const sdoc = sandbox.contentDocument;
  const defaults = new Map();
  const defaultsFor = (tag) => {
    if (defaults.has(tag)) return defaults.get(tag);
    const probe = sdoc.createElement(tag);
    sdoc.body.appendChild(probe);
    const style = sandbox.contentWindow.getComputedStyle(probe);
    const out = {};
    for (const prop of [...OWN, ...INHERITED]) out[prop] = style.getPropertyValue(prop);
    probe.remove();
    defaults.set(tag, out);
    return out;
  };
  const replaced = new Set(['img', 'svg', 'video', 'canvas', 'iframe', 'input', 'select', 'textarea', 'picture']);
  const walk = (el, parentStyle, isRoot) => {
    const tag = el.tagName.toLowerCase();
    const style = getComputedStyle(el);
    const attrs = [];
    for (const attr of [...el.attributes]) {
      if (attr.name === 'class' || attr.name === 'style' || attr.name === LOC || attr.name.startsWith('data-studio') || attr.name === 'contenteditable') continue;
      attrs.push([attr.name, attr.value]);
    }
    if (tag === 'svg') {
      const clone = el.cloneNode(true);
      for (const node of [clone, ...clone.querySelectorAll('*')]) { node.removeAttribute(LOC); node.removeAttribute('class'); }
      const styles = [['width', style.width], ['height', style.height], ['color', style.color]];
      return { tag, attrs: [], styles, children: [], raw: clone.outerHTML };
    }
    const styles = [];
    const base = defaultsFor(tag);
    for (const prop of INHERITED) {
      const value = style.getPropertyValue(prop);
      const reference = isRoot || !parentStyle ? base[prop] : parentStyle.getPropertyValue(prop);
      if (value !== reference) styles.push([prop, value]);
    }
    for (const prop of OWN) {
      const value = style.getPropertyValue(prop);
      if (value === base[prop]) continue;
      if ((prop === 'min-width' || prop === 'min-height') && value === 'auto') continue;
      if (prop === 'text-decoration-color' && style.getPropertyValue('text-decoration-line') === 'none') continue;
      if (prop.startsWith('outline-') && style.getPropertyValue('outline-style') === 'none') continue;
      if (prop.startsWith('border-') && prop.endsWith('-color') && style.getPropertyValue(prop.replace('-color', '-style')) === 'none') continue;
      styles.push([prop, value]);
    }
    const px = (value) => value.replace(/(\\d+\\.\\d{2})\\d+px/g, '$1px');
    if (isRoot || replaced.has(tag)) styles.push(['width', px(style.width)]);
    if (replaced.has(tag)) styles.push(['height', px(style.height)]);
    const children = [];
    for (const child of el.childNodes) {
      if (child.nodeType === 3) { if (child.textContent) children.push(child.textContent); }
      else if (child.nodeType === 1 && !['SCRIPT', 'STYLE', 'TEMPLATE'].includes(child.tagName)) children.push(walk(child, style, false));
    }
    return { tag, attrs, styles, children };
  };
  try { return walk(root, root.parentElement ? getComputedStyle(root.parentElement) : null, true); }
  finally { sandbox.remove(); }
})()`;
}

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);

function escapeText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function sides(map: Map<string, string>, names: [string, string, string, string], short: string): void {
  const values = names.map((name) => map.get(name));
  if (values.some((value) => value === undefined)) return;
  const [top, right, bottom, left] = values as [string, string, string, string];
  for (const name of names) map.delete(name);
  if (top === right && top === bottom && top === left) map.set(short, top);
  else if (top === bottom && right === left) map.set(short, `${top} ${right}`);
  else map.set(short, `${top} ${right} ${bottom} ${left}`);
}

const SIDES = ['top', 'right', 'bottom', 'left'];

function compactBorder(map: Map<string, string>): void {
  const parts = SIDES.map((side) => [map.get(`border-${side}-width`), map.get(`border-${side}-style`), map.get(`border-${side}-color`)]);
  const touched = parts.some((part) => part.some((value) => value !== undefined));
  if (!touched) return;
  const clear = () => {
    for (const side of SIDES) for (const part of ['width', 'style', 'color']) map.delete(`border-${side}-${part}`);
  };
  if (parts.every((part) => part[1] === 'none' || part[0] === '0px')) {
    clear();
    map.set('border', 'none');
    return;
  }
  const first = parts[0];
  if (first && first.every((value) => value !== undefined) && parts.every((part) => part[0] === first[0] && part[1] === first[1] && part[2] === first[2])) {
    clear();
    map.set('border', `${first[0]} ${first[1]} ${first[2]}`);
  }
}

function compact(styles: [string, string][]): [string, string][] {
  const map = new Map(styles);
  sides(map, ['padding-top', 'padding-right', 'padding-bottom', 'padding-left'], 'padding');
  sides(map, ['margin-top', 'margin-right', 'margin-bottom', 'margin-left'], 'margin');
  sides(map, ['border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius'], 'border-radius');
  compactBorder(map);
  const rowGap = map.get('row-gap');
  if (rowGap !== undefined && rowGap === map.get('column-gap')) {
    map.delete('row-gap');
    map.delete('column-gap');
    map.set('gap', rowGap);
  }
  const ox = map.get('overflow-x');
  if (ox !== undefined && ox === map.get('overflow-y')) {
    map.delete('overflow-x');
    map.delete('overflow-y');
    map.set('overflow', ox);
  }
  return [...map.entries()].filter(([, value]) => value !== '');
}

function renderHtml(root: StyledNode): string {
  const rules: string[] = [];
  const names = new Map<string, string>();
  let count = 0;
  const open = (node: StyledNode, depth: number): string => {
    const pad = '  '.repeat(depth);
    if (node.raw) return `${pad}${node.raw}`;
    const styles = compact(node.styles);
    const attrs = node.attrs.map(([name, value]) => ` ${name}="${escapeAttr(value)}"`).join('');
    let cls = '';
    if (styles.length > 0) {
      const body = styles.map(([prop, value]) => `  ${prop}: ${value};`).join('\n');
      let name = names.get(body);
      if (!name) {
        count += 1;
        name = count === 1 ? 'el' : `el-${count}`;
        names.set(body, name);
        rules.push(`.${name} {\n${body}\n}`);
      }
      cls = ` class="${name}"`;
    }
    const head = `<${node.tag}${cls}${attrs}>`;
    if (VOID.has(node.tag)) return `${pad}${head}`;
    const kids = node.children.filter((child) => typeof child !== 'string' || child.trim() !== '');
    if (kids.length === 1 && typeof kids[0] === 'string') return `${pad}${head}${escapeText(kids[0].trim())}</${node.tag}>`;
    const inner = kids.map((child) => (typeof child === 'string' ? `${'  '.repeat(depth + 1)}${escapeText(child.trim())}` : open(child, depth + 1))).join('\n');
    return `${pad}${head}\n${inner}\n${pad}</${node.tag}>`;
  };
  const markup = open(root, 0);
  return `<style>\n${rules.join('\n')}\n</style>\n${markup}\n`;
}

const TW_KEYWORDS: Record<string, Record<string, string>> = {
  display: { flex: 'flex', block: 'block', 'inline-block': 'inline-block', inline: 'inline', grid: 'grid', 'inline-flex': 'inline-flex', none: 'hidden', contents: 'contents' },
  position: { relative: 'relative', absolute: 'absolute', fixed: 'fixed', sticky: 'sticky' },
  'flex-direction': { column: 'flex-col', row: 'flex-row', 'column-reverse': 'flex-col-reverse', 'row-reverse': 'flex-row-reverse' },
  'flex-wrap': { wrap: 'flex-wrap', nowrap: 'flex-nowrap' },
  'align-items': { center: 'items-center', 'flex-start': 'items-start', start: 'items-start', 'flex-end': 'items-end', end: 'items-end', baseline: 'items-baseline', stretch: 'items-stretch' },
  'justify-content': { center: 'justify-center', 'flex-start': 'justify-start', start: 'justify-start', 'flex-end': 'justify-end', end: 'justify-end', 'space-between': 'justify-between', 'space-around': 'justify-around', 'space-evenly': 'justify-evenly' },
  'text-align': { left: 'text-left', center: 'text-center', right: 'text-right', justify: 'text-justify', start: 'text-start', end: 'text-end' },
  'font-style': { italic: 'italic', normal: 'not-italic' },
  'text-transform': { uppercase: 'uppercase', lowercase: 'lowercase', capitalize: 'capitalize', none: 'normal-case' },
  'box-sizing': { 'border-box': 'box-border', 'content-box': 'box-content' },
  overflow: { hidden: 'overflow-hidden', auto: 'overflow-auto', scroll: 'overflow-scroll', visible: 'overflow-visible', clip: 'overflow-clip' },
  'white-space': { nowrap: 'whitespace-nowrap', pre: 'whitespace-pre', 'pre-wrap': 'whitespace-pre-wrap', normal: 'whitespace-normal' },
  'text-decoration-line': { underline: 'underline', 'line-through': 'line-through', none: 'no-underline' },
  border: { none: 'border-0' },
};

const TW_PREFIX: Record<string, string> = {
  padding: 'p', margin: 'm', 'padding-top': 'pt', 'padding-right': 'pr', 'padding-bottom': 'pb', 'padding-left': 'pl', 'margin-top': 'mt', 'margin-right': 'mr', 'margin-bottom': 'mb', 'margin-left': 'ml', gap: 'gap', 'row-gap': 'gap-y', 'column-gap': 'gap-x', width: 'w', height: 'h', 'min-width': 'min-w', 'max-width': 'max-w', 'min-height': 'min-h', 'max-height': 'max-h',
  color: 'text', 'background-color': 'bg', 'font-size': 'text', 'font-weight': 'font', 'line-height': 'leading', 'letter-spacing': 'tracking', 'border-radius': 'rounded', opacity: 'opacity',
  top: 'top', right: 'right', bottom: 'bottom', left: 'left', 'z-index': 'z', 'box-shadow': 'shadow', 'flex-grow': 'grow', 'flex-shrink': 'shrink', 'flex-basis': 'basis', order: 'order',
  'grid-template-columns': 'grid-cols', 'grid-template-rows': 'grid-rows', 'font-family': 'font', 'aspect-ratio': 'aspect',
};

const TW_TYPE_HINT: Record<string, string> = { color: 'color:', 'background-color': 'color:', 'font-size': 'length:', 'font-family': 'family-name:' };

function twValue(value: string): string {
  return value.trim().replace(/_/g, '\\_').replace(/"/g, "'").replace(/\s+/g, '_');
}

function tailwindClass(prop: string, value: string): string {
  const keyword = TW_KEYWORDS[prop]?.[value];
  if (keyword) return keyword;
  const prefix = TW_PREFIX[prop];
  if (prefix) return `${prefix}-[${TW_TYPE_HINT[prop] ?? ''}${twValue(value)}]`;
  return `[${prop}:${twValue(value)}]`;
}

function renderTailwind(root: StyledNode): string {
  const open = (node: StyledNode, depth: number): string => {
    const pad = '  '.repeat(depth);
    if (node.raw) return `${pad}${node.raw}`;
    const classes = compact(node.styles).filter(([prop, value]) => !(prop === 'box-sizing' && value === 'border-box')).map(([prop, value]) => tailwindClass(prop, value));
    const attrs = node.attrs.map(([name, value]) => ` ${name}="${escapeAttr(value)}"`).join('');
    const head = `<${node.tag}${classes.length > 0 ? ` class="${escapeAttr(classes.join(' '))}"` : ''}${attrs}>`;
    if (VOID.has(node.tag)) return `${pad}${head}`;
    const kids = node.children.filter((child) => typeof child !== 'string' || child.trim() !== '');
    if (kids.length === 1 && typeof kids[0] === 'string') return `${pad}${head}${escapeText(kids[0].trim())}</${node.tag}>`;
    const inner = kids.map((child) => (typeof child === 'string' ? `${'  '.repeat(depth + 1)}${escapeText(child.trim())}` : open(child, depth + 1))).join('\n');
    return `${pad}${head}\n${inner}\n${pad}</${node.tag}>`;
  };
  return `${open(root, 0)}\n`;
}

export async function copyAsCode(preview: PreviewService, url: string, frame: ExportFrame, selector: string, format: CopyCodeFormat): Promise<string> {
  if (!preview.withPage) throw new Error('this preview backend cannot read the page');
  const tree = await preview.withPage(withPagePath(url, frame.path), { width: frame.width, height: frame.height }, async (page) => {
    await waitForPage(page);
    return page.evaluate<StyledNode | null>(collectExpression(selector));
  });
  if (!tree) throw new BadRequestError('The selected element is not on this page');
  return format === 'tailwind' ? renderTailwind(tree) : renderHtml(tree);
}
