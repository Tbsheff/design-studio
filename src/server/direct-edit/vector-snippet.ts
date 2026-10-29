import type { VectorBox } from '../../shared/vector.js';
import { round } from './vector-geometry.js';

const JSX_NAMES: Record<string, string> = {
  'stroke-width': 'strokeWidth',
  'stroke-linecap': 'strokeLinecap',
  'stroke-linejoin': 'strokeLinejoin',
  'fill-rule': 'fillRule',
  'clip-rule': 'clipRule',
};

export type Attrs = Record<string, string | number | undefined>;

export function jsxAttrName(name: string): string {
  return JSX_NAMES[name] ?? name;
}

function escape(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

export function attrText(attrs: Attrs, html: boolean): string {
  return Object.entries(attrs)
    .filter((entry): entry is [string, string | number] => entry[1] !== undefined)
    .map(([name, value]) => ` ${html ? name : jsxAttrName(name)}="${escape(String(value))}"`)
    .join('');
}

export function placeStyle(box: VectorBox, html: boolean): string {
  const left = round(box.x);
  const top = round(box.y);
  return html ? ` style="position: absolute; left: ${left}px; top: ${top}px"` : ` style={{ position: 'absolute', left: ${left}, top: ${top} }}`;
}

export function elementText(tag: string, attrs: Attrs, html: boolean): string {
  return `<${tag}${attrText(attrs, html)} />`;
}

export function svgText(name: string, box: VectorBox, child: string, html: boolean): string {
  const width = round(box.width);
  const height = round(box.height);
  const attrs = attrText({ 'data-name': name, width, height, viewBox: `0 0 ${width} ${height}`, fill: 'none', overflow: 'visible' }, html);
  return `<svg${attrs}${placeStyle(box, html)}>\n  ${child}\n</svg>`;
}
