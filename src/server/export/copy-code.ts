import { SOURCE_LOC_ATTR } from '../../shared/contracts.js';
import type { CopyCodeFormat, ExportFrame } from '../../shared/export.js';
import { tailwindClassesFor } from '../direct-edit/tailwind/copy.js';
import { defaultTailwindTheme, type TailwindTheme } from '../direct-edit/tailwind/theme.js';
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
const ROOT_TYPE = ['color', 'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing'];
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
  const ROOT_TYPE = ${JSON.stringify(ROOT_TYPE)};
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
      if (isRoot && ROOT_TYPE.includes(prop)) {
        styles.push([prop, value]);
        continue;
      }
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

function renderTailwind(root: StyledNode, theme: TailwindTheme): string {
  const open = (node: StyledNode, depth: number): string => {
    const pad = '  '.repeat(depth);
    if (node.raw) return `${pad}${node.raw}`;
    const classes = tailwindClassesFor(compact(node.styles).filter(([prop, value]) => !(prop === 'box-sizing' && value === 'border-box')), theme);
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

export async function copyAsCode(preview: PreviewService, url: string, frame: ExportFrame, selector: string, format: CopyCodeFormat, theme: TailwindTheme | null = null): Promise<string> {
  if (!preview.withPage) throw new Error('this preview backend cannot read the page');
  const tree = await preview.withPage(withPagePath(url, frame.path), { width: frame.width, height: frame.height }, async (page) => {
    await waitForPage(page);
    return page.evaluate<StyledNode | null>(collectExpression(selector));
  });
  if (!tree) throw new BadRequestError('The selected element is not on this page');
  return format === 'tailwind' ? renderTailwind(tree, theme ?? (await defaultTailwindTheme())) : renderHtml(tree);
}
