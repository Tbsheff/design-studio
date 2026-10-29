import { readFile, realpath } from 'node:fs/promises';
import type { CompiledTokenEntry, Direction, Project } from '../../shared/contracts.js';
import { FIGMA_LAYERS_MAX, type FigmaColor, type FigmaEffect, type FigmaImportPreview, type FigmaImportStats, type FigmaNode, type FigmaPaint } from '../../shared/figma-nodes.js';
import { JSX_SNIPPET_MAX, type InsertJsxRequest, type InsertTarget, type JsxInsertPosition } from '../../shared/insert.js';
import { COLOR_SNAP_DELTA, matchColor, matchFontFamily } from '../../shared/token-match.js';
import { appTokenEntries, buildAppTokens } from '../design-system/app-tokens/tokens.js';
import { readCssTokens } from '../design-system/app-tokens/read-css.js';
import { resolveSource } from '../direct-edit/index.js';
import { tokenEntriesFor } from '../direct-edit/style-scan.js';
import { tailwindClassesFor } from '../direct-edit/tailwind/copy.js';
import { tailwindThemeFor, type TailwindTheme } from '../direct-edit/tailwind/theme.js';
import { loadKit, type KitMatch, type KitMatcher } from './kit-match.js';
import { FigmaInputError, frameOf, listFrames, pickFrame, type FigmaDocument } from './nodes.js';

type Styles = Array<[string, string]>;
type Axis = 'h' | 'v';
type Sizing = 'FIXED' | 'HUG' | 'FILL';
type ColorUse = 'bg' | 'text' | 'border';

export interface MarkupContext {
  mode: 'html' | 'jsx';
  theme: TailwindTheme | null;
  tokens: CompiledTokenEntry[];
  kit: KitMatcher | null;
}

interface El {
  tag: string;
  attrs: Array<[string, string]>;
  styles: Styles;
  text: string | null;
  children: El[];
}

interface Parent {
  direction: 'row' | 'column' | null;
  box: FigmaNode['absoluteBoundingBox'];
  inline: boolean;
}

interface Walk {
  ctx: MarkupContext;
  stats: FigmaImportStats;
  raw: Set<string>;
  fonts: Set<string>;
}

const SHAPES = new Set(['RECTANGLE', 'ELLIPSE', 'VECTOR', 'LINE', 'STAR', 'POLYGON', 'BOOLEAN_OPERATION', 'REGULAR_POLYGON']);
const INLINE_TAGS = new Set(['button', 'a', 'span', 'label']);
const VOID = new Set(['img', 'br']);
const DEFAULT_NAME = /^(Frame|Group|Rectangle|Ellipse|Vector|Text|Line|Union|Subtract|Instance|Auto layout) ?\d*$/i;
const JUSTIFY: Record<string, string> = { CENTER: 'center', MAX: 'flex-end', SPACE_BETWEEN: 'space-between' };
const ALIGN: Record<string, string> = { MIN: 'flex-start', CENTER: 'center', MAX: 'flex-end', BASELINE: 'baseline' };
const TEXT_ALIGN: Record<string, string> = { CENTER: 'center', RIGHT: 'right', JUSTIFIED: 'justify' };
const TEXT_CASE: Record<string, string> = { UPPER: 'uppercase', LOWER: 'lowercase', TITLE: 'capitalize' };
const DECORATION: Record<string, string> = { UNDERLINE: 'underline', STRIKETHROUGH: 'line-through' };
const NEAR_TIE = 0.004;

function px(value: number): string {
  return `${Math.round(value * 100) / 100}px`;
}

function visible<T extends { visible?: boolean }>(items: T[] | undefined): T[] {
  return (items ?? []).filter((item) => item.visible !== false);
}

function channel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value * 255)));
}

function rawColor(color: FigmaColor, opacity = 1): { css: string; hex: string; alpha: number } {
  const hex = `#${[color.r, color.g, color.b].map((value) => channel(value).toString(16).padStart(2, '0')).join('')}`;
  const alpha = Math.round((color.a ?? 1) * opacity * 1000) / 1000;
  const css = alpha >= 0.999 ? hex : `rgb(${channel(color.r)} ${channel(color.g)} ${channel(color.b)} / ${alpha})`;
  return { css, hex, alpha };
}

function penalty(name: string, use: ColorUse): number {
  const ink = /foreground|ink|text/.test(name);
  let score = /^--color-/.test(name) ? 2 : 0;
  if (/sidebar|chart|popover/.test(name)) score += 3;
  if (use === 'text' && !ink) score += 1;
  if (use === 'bg' && ink) score += 1;
  if (use === 'border' && !/border|line|input/.test(name)) score += 1;
  if (use !== 'border' && /border|line|input|ring/.test(name)) score += 1;
  return score;
}

function snapColor(hex: string, use: ColorUse, tokens: CompiledTokenEntry[]): string | null {
  const matches = matchColor(hex, tokens);
  const best = matches[0];
  if (!best || best.distance > COLOR_SNAP_DELTA) return null;
  const near = matches.filter((match) => match.distance <= best.distance + NEAR_TIE);
  near.sort((a, b) => penalty(a.cssVar, use) - penalty(b.cssVar, use) || a.distance - b.distance);
  return near[0]?.cssVar ?? null;
}

function colorCss(color: FigmaColor, opacity: number | undefined, use: ColorUse, walk: Walk): string {
  const value = rawColor(color, opacity ?? 1);
  if (value.alpha >= 0.999) {
    const token = snapColor(value.hex, use, walk.ctx.tokens);
    if (token) {
      walk.stats.tokens += 1;
      return `var(${token})`;
    }
  }
  walk.raw.add(value.css);
  return value.css;
}

function gradientCss(paint: FigmaPaint, walk: Walk): string | null {
  const stops = paint.gradientStops ?? [];
  if (stops.length < 2) return null;
  const [start, end] = paint.gradientHandlePositions ?? [];
  const angle = start && end ? Math.round((Math.atan2(end.y - start.y, end.x - start.x) * 180) / Math.PI + 90) : 180;
  const list = stops.map((stop) => `${colorCss(stop.color, paint.opacity, 'bg', walk)} ${Math.round(stop.position * 100)}%`);
  return `linear-gradient(${angle}deg, ${list.join(', ')})`;
}

function topPaint(paints: FigmaPaint[] | undefined): FigmaPaint | null {
  return visible(paints).at(-1) ?? null;
}

function fillStyles(node: FigmaNode, walk: Walk): Styles {
  const paint = topPaint(node.fills);
  if (!paint) return [];
  if (paint.type === 'SOLID' && paint.color) return [['background-color', colorCss(paint.color, paint.opacity, 'bg', walk)]];
  if (paint.type === 'GRADIENT_LINEAR') {
    const gradient = gradientCss(paint, walk);
    return gradient ? [['background-image', gradient]] : [];
  }
  if (paint.type === 'IMAGE') {
    walk.stats.images += 1;
    return [['background-color', 'rgb(127 127 127 / 0.2)']];
  }
  return [];
}

function strokeStyles(node: FigmaNode, walk: Walk): Styles {
  const paint = topPaint(node.strokes);
  if (!paint?.color || paint.type !== 'SOLID') return [];
  const color = colorCss(paint.color, paint.opacity, 'border', walk);
  const sides = node.individualStrokeWeights;
  if (!sides) return node.strokeWeight ? [['border', `${px(node.strokeWeight)} solid ${color}`]] : [];
  const out: Styles = [];
  for (const side of ['top', 'right', 'bottom', 'left'] as const) if (sides[side] > 0) out.push([`border-${side}`, `${px(sides[side])} solid ${color}`]);
  return out;
}

function radiusStyles(node: FigmaNode): Styles {
  if (node.type === 'ELLIPSE') return [['border-radius', '50%']];
  const corners = node.rectangleCornerRadii;
  if (corners && corners.length === 4 && new Set(corners).size > 1) return [['border-radius', corners.map(px).join(' ')]];
  const radius = corners?.[0] ?? node.cornerRadius ?? 0;
  return radius > 0 ? [['border-radius', radius >= 999 ? '9999px' : px(radius)]] : [];
}

function shadowCss(effect: FigmaEffect): string {
  const offset = effect.offset ?? { x: 0, y: 0 };
  const color = effect.color ? rawColor(effect.color).css : 'rgb(0 0 0 / 0.1)';
  const parts = [effect.type === 'INNER_SHADOW' ? 'inset' : '', px(offset.x), px(offset.y), px(effect.radius ?? 0), effect.spread ? px(effect.spread) : '', color];
  return parts.filter(Boolean).join(' ');
}

function effectStyles(node: FigmaNode, walk: Walk): Styles {
  const effects = visible(node.effects);
  const shadows = effects.filter((effect) => effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW').map(shadowCss);
  const out: Styles = shadows.length > 0 ? [['box-shadow', shadows.join(', ')]] : [];
  const blur = effects.find((effect) => effect.type === 'LAYER_BLUR');
  if (blur?.radius) out.push(['filter', `blur(${px(blur.radius / 2)})`]);
  const backdrop = effects.find((effect) => effect.type === 'BACKGROUND_BLUR');
  if (backdrop?.radius) out.push(['backdrop-filter', `blur(${px(backdrop.radius / 2)})`]);
  return out;
}

function lookStyles(node: FigmaNode, walk: Walk): Styles {
  const out: Styles = [...fillStyles(node, walk), ...strokeStyles(node, walk), ...radiusStyles(node), ...effectStyles(node, walk)];
  if (node.opacity !== undefined && node.opacity < 0.999) out.push(['opacity', String(Math.round(node.opacity * 100) / 100)]);
  if (node.clipsContent) out.push(['overflow', 'hidden']);
  return out;
}

function directionOf(node: FigmaNode): Parent['direction'] {
  if (node.layoutMode === 'HORIZONTAL') return 'row';
  if (node.layoutMode === 'VERTICAL') return 'column';
  return null;
}

function paddingCss(node: FigmaNode): string | null {
  const sides = [node.paddingTop ?? 0, node.paddingRight ?? 0, node.paddingBottom ?? 0, node.paddingLeft ?? 0];
  if (sides.every((side) => side === 0)) return null;
  const [top, right, bottom, left] = sides as [number, number, number, number];
  if (top === bottom && right === left) return top === right ? px(top) : `${px(top)} ${px(right)}`;
  return sides.map(px).join(' ');
}

function gapStyles(node: FigmaNode): Styles {
  if (node.primaryAxisAlignItems === 'SPACE_BETWEEN') return node.layoutWrap === 'WRAP' && node.counterAxisSpacing ? [['row-gap', px(node.counterAxisSpacing)]] : [];
  const main = node.itemSpacing ?? 0;
  if (node.layoutWrap === 'WRAP' && node.counterAxisSpacing !== undefined && node.counterAxisSpacing !== main) return [['gap', `${px(node.counterAxisSpacing)} ${px(main)}`]];
  return main > 0 ? [['gap', px(main)]] : [];
}

function layoutStyles(node: FigmaNode, hasChildren: boolean): Styles {
  const direction = directionOf(node);
  if (!direction) return hasChildren ? [['position', 'relative']] : [];
  const out: Styles = [['display', 'flex']];
  if (direction === 'column') out.push(['flex-direction', 'column']);
  if (node.layoutWrap === 'WRAP') out.push(['flex-wrap', 'wrap']);
  out.push(...gapStyles(node));
  const padding = paddingCss(node);
  if (padding) out.push(['padding', padding]);
  const justify = JUSTIFY[node.primaryAxisAlignItems ?? ''];
  if (justify) out.push(['justify-content', justify]);
  out.push(['align-items', ALIGN[node.counterAxisAlignItems ?? 'MIN'] ?? 'flex-start']);
  return out;
}

function ownAxisSizing(node: FigmaNode, axis: Axis): Sizing | null {
  const direction = directionOf(node);
  if (!direction) return null;
  const primary = (direction === 'row') === (axis === 'h');
  const mode = primary ? (node.primaryAxisSizingMode ?? 'AUTO') : (node.counterAxisSizingMode ?? 'FIXED');
  return mode === 'AUTO' ? 'HUG' : 'FIXED';
}

function textSizing(node: FigmaNode, axis: Axis): Sizing | null {
  if (node.type !== 'TEXT') return null;
  if (node.textAutoResize === 'WIDTH_AND_HEIGHT') return 'HUG';
  if (node.textAutoResize === 'HEIGHT' && axis === 'v') return 'HUG';
  return 'FIXED';
}

function sizingOf(node: FigmaNode, axis: Axis, parent: Parent | null): Sizing {
  const explicit = axis === 'h' ? node.layoutSizingHorizontal : node.layoutSizingVertical;
  if (explicit === 'FIXED' || explicit === 'HUG' || explicit === 'FILL') return explicit;
  if (parent?.direction) {
    const main = (parent.direction === 'row') === (axis === 'h');
    if (main && node.layoutGrow === 1) return 'FILL';
    if (!main && node.layoutAlign === 'STRETCH') return 'FILL';
  }
  return ownAxisSizing(node, axis) ?? textSizing(node, axis) ?? 'FIXED';
}

function sizeOf(node: FigmaNode, axis: Axis): number | null {
  const box = node.absoluteBoundingBox;
  if (!box) return null;
  return axis === 'h' ? box.width : box.height;
}

function axisStyles(node: FigmaNode, axis: Axis, parent: Parent): Styles {
  const sizing = sizingOf(node, axis, parent);
  const main = (parent.direction === 'row') === (axis === 'h');
  const prop = axis === 'h' ? 'width' : 'height';
  if (sizing === 'FILL') return main ? [['flex', '1 1 0'], [axis === 'h' ? 'min-width' : 'min-height', '0']] : [['align-self', 'stretch']];
  const size = sizeOf(node, axis);
  if (sizing === 'HUG' || size === null || (node.type === 'TEXT' && axis === 'v')) return [];
  return main ? [[prop, px(size)], ['flex-shrink', '0']] : [[prop, px(size)]];
}

function absoluteStyles(node: FigmaNode, parent: Parent): Styles {
  const box = node.absoluteBoundingBox;
  if (!box) return [];
  const origin = parent.box ?? { x: box.x, y: box.y };
  const out: Styles = [['position', 'absolute'], ['left', px(box.x - origin.x)], ['top', px(box.y - origin.y)], ['width', px(box.width)]];
  if (node.type !== 'TEXT') out.push(['height', px(box.height)]);
  return out;
}

function rootStyles(node: FigmaNode): Styles {
  const out: Styles = [];
  const width = sizeOf(node, 'h');
  const horizontal = sizingOf(node, 'h', null);
  if (horizontal === 'FILL') out.push(['width', '100%']);
  else if (horizontal === 'HUG') out.push(['width', 'fit-content']);
  else if (width !== null) out.push(['width', px(width)], ['max-width', '100%']);
  const height = sizeOf(node, 'v');
  if (sizingOf(node, 'v', null) === 'FIXED' && height !== null && node.type !== 'TEXT') out.push(['height', px(height)]);
  return out;
}

function placement(node: FigmaNode, parent: Parent | null): Styles {
  if (!parent) return rootStyles(node);
  if (!parent.direction || node.layoutPositioning === 'ABSOLUTE') return absoluteStyles(node, parent);
  return [...axisStyles(node, 'h', parent), ...axisStyles(node, 'v', parent)];
}

function fontStyles(node: FigmaNode, walk: Walk): Styles {
  const family = node.style?.fontFamily;
  if (!family) return [];
  const match = matchFontFamily(family, walk.ctx.tokens)[0];
  if (match?.exact) return [['font-family', `var(${match.cssVar})`]];
  walk.fonts.add(family);
  return [];
}

function lineHeight(style: NonNullable<FigmaNode['style']>): string | null {
  if (style.lineHeightUnit === 'INTRINSIC_%') return null;
  if (style.lineHeightUnit === 'FONT_SIZE_%' && style.lineHeightPercentFontSize) return String(Math.round(style.lineHeightPercentFontSize) / 100);
  return style.lineHeightPx ? px(style.lineHeightPx) : null;
}

function typeStyles(node: FigmaNode): Styles {
  const style = node.style ?? {};
  const out: Styles = [];
  if (style.fontSize) out.push(['font-size', px(style.fontSize)]);
  if (style.fontWeight && style.fontWeight !== 400) out.push(['font-weight', String(style.fontWeight)]);
  const leading = lineHeight(style);
  if (leading) out.push(['line-height', leading]);
  if (style.letterSpacing && Math.abs(style.letterSpacing) > 0.01) out.push(['letter-spacing', px(style.letterSpacing)]);
  const extras: Array<[string, string | undefined]> = [['text-align', TEXT_ALIGN[style.textAlignHorizontal ?? '']], ['text-transform', TEXT_CASE[style.textCase ?? '']], ['text-decoration-line', DECORATION[style.textDecoration ?? '']], ['font-style', style.italic ? 'italic' : undefined]];
  for (const [prop, value] of extras) if (value) out.push([prop, value]);
  return out;
}

function textColor(node: FigmaNode, walk: Walk): Styles {
  const paint = topPaint(node.fills);
  return paint?.type === 'SOLID' && paint.color ? [['color', colorCss(paint.color, paint.opacity, 'text', walk)]] : [];
}

function textTag(node: FigmaNode, parent: Parent | null): string {
  if (parent?.inline) return 'span';
  const size = node.style?.fontSize ?? 16;
  const weight = node.style?.fontWeight ?? 400;
  if (size >= 28) return 'h2';
  if (size >= 20 && weight >= 600) return 'h3';
  return 'p';
}

function textElement(node: FigmaNode, parent: Parent | null, walk: Walk): El {
  const tag = textTag(node, parent);
  const reset: Styles = tag !== 'span' && !walk.ctx.theme ? [['margin', '0']] : [];
  const styles = [...placement(node, parent), ...reset, ...fontStyles(node, walk), ...typeStyles(node), ...textColor(node, walk)];
  return { tag, attrs: [], styles, text: node.characters ?? '', children: [] };
}

function placeholderSrc(node: FigmaNode): string {
  const w = Math.max(1, Math.round(sizeOf(node, 'h') ?? 160));
  const h = Math.max(1, Math.round(sizeOf(node, 'v') ?? 120));
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${w} ${h}'%3E%3Crect width='100%25' height='100%25' fill='%23a3a3a3' fill-opacity='.35'/%3E%3C/svg%3E`;
}

function shapeElement(node: FigmaNode, parent: Parent | null, walk: Walk): El {
  const paint = topPaint(node.fills);
  if (paint?.type === 'IMAGE') {
    walk.stats.images += 1;
    const fit = paint.scaleMode === 'FIT' ? 'contain' : 'cover';
    const styles: Styles = [...placement(node, parent), ['display', 'block'], ['object-fit', fit], ...radiusStyles(node), ...effectStyles(node, walk)];
    return { tag: 'img', attrs: [['src', placeholderSrc(node)], ['alt', DEFAULT_NAME.test(node.name) ? '' : node.name]], styles, text: null, children: [] };
  }
  if (node.type === 'VECTOR' || node.type === 'BOOLEAN_OPERATION' || node.type === 'STAR') walk.stats.notes.push(`${node.name} is a vector; it is a box with its fill. Replace it with an icon.`);
  return { tag: 'div', attrs: nameAttr(node), styles: [...placement(node, parent), ...lookStyles(node, walk)], text: null, children: [] };
}

function nameAttr(node: FigmaNode): Array<[string, string]> {
  return DEFAULT_NAME.test(node.name.trim()) ? [] : [['data-name', node.name.trim().slice(0, 80)]];
}

function semanticTag(node: FigmaNode, parent: Parent | null): { tag: string; attrs: Array<[string, string]>; styles: Styles } {
  if (parent?.inline) return { tag: 'span', attrs: [], styles: [] };
  if (node.type === 'INSTANCE' && /^button\b/i.test(node.name)) return { tag: 'button', attrs: [['type', 'button']], styles: [['border', '0'], ['font', 'inherit'], ['cursor', 'pointer']] };
  if (node.type === 'INSTANCE' && /^link\b/i.test(node.name)) return { tag: 'a', attrs: [['href', '#']], styles: [['text-decoration-line', 'none']] };
  return { tag: 'div', attrs: [], styles: [] };
}

function frameElement(node: FigmaNode, parent: Parent | null, walk: Walk): El {
  const base = semanticTag(node, parent);
  const kids = visible(node.children);
  const styles: Styles = [...placement(node, parent), ...layoutStyles(node, kids.length > 0), ...lookStyles(node, walk), ...base.styles];
  const self: Parent = { direction: directionOf(node), box: node.absoluteBoundingBox ?? null, inline: INLINE_TAGS.has(base.tag) };
  if (!self.direction && node.type !== 'GROUP' && kids.length > 0) {
    const height = sizeOf(node, 'v');
    if (parent?.direction && height !== null && !styles.some(([prop]) => prop === 'height')) styles.push(['height', px(height)]);
    if (!parent && height !== null && !styles.some(([prop]) => prop === 'height')) styles.push(['height', px(height)]);
  }
  if (node.type === 'GROUP') styles.push(['width', px(sizeOf(node, 'h') ?? 0)], ['height', px(sizeOf(node, 'v') ?? 0)]);
  return { tag: base.tag, attrs: [...base.attrs, ...nameAttr(node)], styles, text: null, children: childrenOf(node, self, walk) };
}

function textOnly(node: FigmaNode): string | null {
  const texts: string[] = [];
  const stack = [...visible(node.children)];
  while (stack.length > 0) {
    const item = stack.pop() as FigmaNode;
    if (item.type === 'TEXT') texts.push(item.characters ?? '');
    if (item.type === 'INSTANCE' || topPaint(item.fills)?.type === 'IMAGE' || texts.length > 1) return null;
    stack.push(...visible(item.children));
  }
  return texts.length === 1 ? (texts[0] ?? '').trim() : null;
}

function kitElement(node: FigmaNode, match: KitMatch, parent: Parent | null, walk: Walk): El {
  walk.stats.kit.push({ layer: node.name, component: match.name, file: match.file });
  const text = textOnly(node);
  const kept = !parent ? rootStyles(node) : parent.direction ? placement(node, parent).filter(([prop]) => prop === 'flex' || prop === 'align-self' || prop === 'min-width') : [];
  if (text !== null) return { tag: match.name, attrs: Object.entries(match.props), styles: kept, text, children: [] };
  const self: Parent = { direction: directionOf(node), box: node.absoluteBoundingBox ?? null, inline: false };
  const styles = [...kept, ...layoutStyles(node, visible(node.children).length > 0)];
  return { tag: match.name, attrs: Object.entries(match.props), styles, text: null, children: childrenOf(node, self, walk) };
}

function convert(node: FigmaNode, parent: Parent | null, walk: Walk): El | null {
  if (node.visible === false) {
    walk.stats.hidden += 1;
    return null;
  }
  walk.stats.layers += 1;
  if (walk.stats.layers > FIGMA_LAYERS_MAX) throw new FigmaInputError(`The frame has more than ${FIGMA_LAYERS_MAX} layers. Import one of its child frames.`);
  const match = node.type === 'INSTANCE' ? walk.ctx.kit?.match(node) : null;
  if (match) return kitElement(node, match, parent, walk);
  if (node.type === 'TEXT') return textElement(node, parent, walk);
  if (SHAPES.has(node.type)) return shapeElement(node, parent, walk);
  return frameElement(node, parent, walk);
}

function childrenOf(node: FigmaNode, self: Parent, walk: Walk): El[] {
  const out: El[] = [];
  for (const child of node.children ?? []) {
    const el = convert(child, self, walk);
    if (el) out.push(el);
  }
  return out;
}

function escapeText(text: string, mode: MarkupContext['mode']): string {
  const html = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return mode === 'jsx' ? html.replace(/\{/g, '&#123;').replace(/\}/g, '&#125;') : html;
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function camel(prop: string): string {
  return prop.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

function styleAttr(styles: Styles, ctx: MarkupContext): string {
  if (styles.length === 0) return '';
  if (ctx.mode === 'html') return ` style="${escapeAttr(styles.map(([prop, value]) => `${prop}: ${value}`).join('; '))}"`;
  if (ctx.theme) return ` className="${escapeAttr(tailwindClassesFor(styles, ctx.theme).map((name) => (name === 'shrink-[0]' ? 'shrink-0' : name)).join(' '))}"`;
  const object = styles.map(([prop, value]) => `${camel(prop)}: '${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`).join(', ');
  return ` style={{ ${object} }}`;
}

function textMarkup(text: string, ctx: MarkupContext): string {
  const br = ctx.mode === 'jsx' ? '<br />' : '<br>';
  return text.split('\n').map((line) => escapeText(line, ctx.mode)).join(br);
}

function render(el: El, ctx: MarkupContext, depth: number): string {
  const pad = '  '.repeat(depth);
  const attrs = el.attrs.map(([name, value]) => ` ${name}="${escapeAttr(value)}"`).join('') + styleAttr(el.styles, ctx);
  if (VOID.has(el.tag)) return `${pad}<${el.tag}${attrs}${ctx.mode === 'jsx' ? ' />' : '>'}`;
  if (el.children.length === 0) return `${pad}<${el.tag}${attrs}>${el.text ? textMarkup(el.text, ctx) : ''}</${el.tag}>`;
  const inner = el.children.map((child) => render(child, ctx, depth + 1)).join('\n');
  return `${pad}<${el.tag}${attrs}>\n${inner}\n${pad}</${el.tag}>`;
}

export function figmaToMarkup(node: FigmaNode, ctx: MarkupContext): { markup: string; stats: FigmaImportStats } {
  const walk: Walk = { ctx, stats: { layers: 0, hidden: 0, tokens: 0, rawColors: [], kit: [], images: 0, notes: [] }, raw: new Set(), fonts: new Set() };
  const root = convert(node, null, walk);
  if (!root) throw new FigmaInputError(`${node.name} is hidden in Figma. Pick a visible frame.`);
  if (!root.attrs.some(([name]) => name === 'data-name')) root.attrs.push(['data-name', node.name.trim().slice(0, 80) || 'Figma frame']);
  const markup = render(root, ctx, 0);
  walk.stats.rawColors = [...walk.raw].slice(0, 20);
  const one = walk.fonts.size === 1;
  if (walk.fonts.size > 0) walk.stats.notes.unshift(`${one ? 'Font' : 'Fonts'} ${[...walk.fonts].join(', ')} ${one ? 'is not a token' : 'are not tokens'} here, so the text uses the page font.`);
  if (walk.stats.images > 0) walk.stats.notes.push(walk.stats.images === 1 ? '1 image fill is a placeholder; set the picture with Replace image.' : `${walk.stats.images} image fills are placeholders; set the pictures with Replace image.`);
  walk.stats.notes = walk.stats.notes.slice(0, 12);
  if (markup.length > JSX_SNIPPET_MAX) throw new FigmaInputError(`${node.name} makes ${markup.length} characters of markup, more than ${JSX_SNIPPET_MAX}. Import one of its child frames: ${visible(node.children).slice(0, 6).map((child) => `${child.id} ${child.name}`).join(', ')}.`);
  return { markup, stats: walk.stats };
}

export interface FigmaImportScope {
  project: Project;
  direction: Direction;
  workTree: string;
}

async function pageTokens(workTree: string, target: InsertTarget): Promise<CompiledTokenEntry[]> {
  const file = target.source?.file;
  if (!file || !/\.html?$/i.test(file)) return [];
  const resolved = await resolveSource(workTree, file).catch(() => null);
  if (!resolved) return [];
  const text = await readFile(resolved.file, 'utf8').catch(() => '');
  const css = [...text.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((match) => match[1] ?? '').join('\n');
  return css ? appTokenEntries(buildAppTokens(readCssTokens(css)), resolved.relative) : [];
}

async function themeOf(scope: FigmaImportScope): Promise<TailwindTheme | null> {
  if (scope.project.kind !== 'react') return null;
  return tailwindThemeFor(await realpath(scope.workTree), null, { projectKind: 'react' }).catch(() => null);
}

export async function markupContext(scope: FigmaImportScope, target: InsertTarget, doc: FigmaDocument): Promise<MarkupContext> {
  const [stored, page, theme, kit] = await Promise.all([tokenEntriesFor(scope.project, scope.direction), pageTokens(scope.workTree, target), themeOf(scope), loadKit(scope.project, scope.workTree, doc)]);
  const tokens = [...page, ...stored.filter((entry) => !page.some((item) => item.cssVar === entry.cssVar))];
  return { mode: scope.project.kind === 'react' ? 'jsx' : 'html', theme, tokens, kit };
}

export interface PreparedImport {
  preview: FigmaImportPreview;
  insert: InsertJsxRequest;
}

export async function prepareFigmaImport(scope: FigmaImportScope, doc: FigmaDocument, input: { nodeId?: string | undefined; target: InsertTarget; position: JsxInsertPosition }): Promise<PreparedImport> {
  const node = pickFrame(doc, input.nodeId);
  const ctx = await markupContext(scope, input.target, doc);
  const { markup, stats } = figmaToMarkup(node, ctx);
  const imports = ctx.kit?.imports(stats.kit) ?? {};
  const preview: FigmaImportPreview = { fileName: doc.fileName, frames: listFrames(doc), frame: frameOf(node), markup, stats };
  const insert: InsertJsxRequest = { target: input.target, position: input.position, jsx: markup, ...(Object.keys(imports).length > 0 ? { imports } : {}) };
  return { preview, insert };
}
