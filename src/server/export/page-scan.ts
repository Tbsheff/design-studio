export interface ScanRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ScanColor {
  hex: string;
  alpha: number;
}

export interface ScanShadow {
  dx: number;
  dy: number;
  blur: number;
  color: ScanColor;
}

export interface ScanBorder {
  width: number;
  color: ScanColor;
  dashed: boolean;
}

export interface ScanBox extends ScanRect {
  kind: 'box';
  fill: ScanColor | null;
  radius: [number, number, number, number];
  border: ScanBorder | null;
  sides: (ScanRect & { color: ScanColor })[];
  shadow: ScanShadow | null;
  raster: boolean;
  opacity: number;
  clip: number;
}

export interface ScanLine extends ScanRect {
  text: string;
  baseline: number;
}

export interface ScanFont {
  family: string;
  size: number;
  weight: number;
  italic: boolean;
}

export interface ScanText {
  kind: 'text';
  lines: ScanLine[];
  font: ScanFont;
  color: ScanColor;
  letterSpacing: number;
  lineHeight: number;
  underline: boolean;
  strike: boolean;
  align: string;
  block: number;
  opacity: number;
  clip: number;
}

export interface ScanSvg extends ScanRect {
  kind: 'svg';
  markup: string;
  opacity: number;
  clip: number;
}

export type ScanItem = ScanBox | ScanText | ScanSvg;

export interface ScanClip extends ScanRect {
  radius: number;
  parent: number;
}

export interface ScanResult {
  width: number;
  height: number;
  background: ScanColor | null;
  items: ScanItem[];
  clips: ScanClip[];
  fontFaces: string[];
  notes: string[];
}

export interface ScanOptions {
  region: ScanRect;
  root: string | null;
  maxItems: number;
  maxFontBytes: number;
  embedFonts: boolean;
}

export async function scanPage(options: ScanOptions): Promise<ScanResult> {
  const region = options.region;
  const notes = new Map<string, number>();
  const note = (text: string): void => {
    notes.set(text, (notes.get(text) ?? 0) + 1);
  };
  const items: ScanItem[] = [];
  const clips: ScanClip[] = [];
  const blocks = new Map<Element, number>();
  const usedFamilies = new Set<string>();
  const probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  const colorCache = new Map<string, ScanColor | null>();
  const round = (value: number): number => Math.round(value * 100) / 100;

  const color = (raw: string): ScanColor | null => {
    if (!raw || raw === 'transparent' || raw === 'none') return null;
    const cached = colorCache.get(raw);
    if (cached !== undefined) return cached;
    let out: ScanColor | null = null;
    if (probe) {
      probe.clearRect(0, 0, 1, 1);
      probe.fillStyle = '#000';
      probe.fillStyle = raw;
      probe.fillRect(0, 0, 1, 1);
      const [r = 0, g = 0, b = 0, a = 0] = probe.getImageData(0, 0, 1, 1).data;
      const hex = [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('');
      out = a === 0 ? null : { hex, alpha: round(a / 255) };
    }
    colorCache.set(raw, out);
    return out;
  };

  const local = (rect: DOMRect | ScanRect): ScanRect => {
    const left = 'left' in rect ? rect.left : rect.x;
    const top = 'top' in rect ? rect.top : rect.y;
    return { x: round(left + window.scrollX - region.x), y: round(top + window.scrollY - region.y), width: round(rect.width), height: round(rect.height) };
  };

  const outside = (box: ScanRect): boolean => box.x + box.width < 0 || box.y + box.height < 0 || box.x > region.width || box.y > region.height;

  const intersect = (a: ScanRect, b: ScanRect): ScanRect => {
    const x = Math.max(a.x, b.x);
    const y = Math.max(a.y, b.y);
    return { x, y, width: Math.max(0, Math.min(a.x + a.width, b.x + b.width) - x), height: Math.max(0, Math.min(a.y + a.height, b.y + b.height) - y) };
  };

  const px = (value: string, base: number): number => {
    const first = value.split(' ')[0] ?? '0';
    if (first.endsWith('%')) return (parseFloat(first) / 100) * base;
    return parseFloat(first) || 0;
  };

  const radii = (style: CSSStyleDeclaration, box: ScanRect): [number, number, number, number] => {
    const side = Math.min(box.width, box.height);
    const list = [style.borderTopLeftRadius, style.borderTopRightRadius, style.borderBottomRightRadius, style.borderBottomLeftRadius].map((value) => round(Math.min(px(value, side), side / 2)));
    return [list[0] ?? 0, list[1] ?? 0, list[2] ?? 0, list[3] ?? 0];
  };

  const shadowOf = (raw: string): ScanShadow | null => {
    if (!raw || raw === 'none' || raw.includes('inset')) return null;
    const first = raw.split(/,(?![^(]*\))/)[0] ?? '';
    const paint = /(rgba?\([^)]*\)|#[0-9a-f]{3,8}|[a-z]+\([^)]*\))/i.exec(first)?.[0] ?? 'rgba(0,0,0,0.3)';
    const nums = first.replace(paint, '').trim().split(/\s+/).map((part) => parseFloat(part));
    const shade = color(paint);
    if (!shade) return null;
    return { dx: nums[0] ?? 0, dy: nums[1] ?? 0, blur: nums[2] ?? 0, color: shade };
  };

  const borderSide = (style: CSSStyleDeclaration, side: 'Top' | 'Right' | 'Bottom' | 'Left'): { width: number; color: ScanColor | null; style: string } => {
    const width = parseFloat(style.getPropertyValue(`border-${side.toLowerCase()}-width`)) || 0;
    const kind = style.getPropertyValue(`border-${side.toLowerCase()}-style`);
    return { width: kind === 'none' || kind === 'hidden' ? 0 : width, color: color(style.getPropertyValue(`border-${side.toLowerCase()}-color`)), style: kind };
  };

  type Side = ReturnType<typeof borderSide>;
  const sameSide = (a: Side, b: Side): boolean => a.width === b.width && a.color?.hex === b.color?.hex && a.color?.alpha === b.color?.alpha;

  const strip = (rect: ScanRect, side: Side | undefined): (ScanRect & { color: ScanColor }) | null => {
    if (!side?.color || rect.width <= 0 || rect.height <= 0) return null;
    return { ...rect, color: side.color };
  };

  const sideStrips = (all: Side[], box: ScanRect): (ScanRect & { color: ScanColor })[] => {
    const [t, r, b, l] = all;
    const top = t?.width ?? 0;
    const right = r?.width ?? 0;
    const bottom = b?.width ?? 0;
    const left = l?.width ?? 0;
    return [
      strip({ x: box.x, y: box.y, width: box.width, height: top }, t),
      strip({ x: box.x + box.width - right, y: box.y, width: right, height: box.height }, r),
      strip({ x: box.x, y: box.y + box.height - bottom, width: box.width, height: bottom }, b),
      strip({ x: box.x, y: box.y, width: left, height: box.height }, l),
    ].filter((item): item is ScanRect & { color: ScanColor } => item !== null);
  };

  const borders = (style: CSSStyleDeclaration, box: ScanRect): { border: ScanBorder | null; sides: (ScanRect & { color: ScanColor })[] } => {
    const all = (['Top', 'Right', 'Bottom', 'Left'] as const).map((side) => borderSide(style, side));
    const painted = all.filter((side) => side.width > 0 && side.color);
    if (painted.length === 0) return { border: null, sides: [] };
    const [top] = all;
    if (top?.color && painted.length === 4 && all.every((side) => sameSide(side, top))) return { border: { width: top.width, color: top.color, dashed: top.style === 'dashed' || top.style === 'dotted' }, sides: [] };
    return { border: null, sides: sideStrips(all, box) };
  };

  const REPLACED = new Set(['IMG', 'CANVAS', 'VIDEO', 'PICTURE', 'IFRAME', 'INPUT', 'TEXTAREA', 'SELECT', 'OBJECT', 'EMBED']);

  const pushBox = (element: Element, style: CSSStyleDeclaration, opacity: number, clip: number): void => {
    const box = local(element.getBoundingClientRect());
    if (box.width < 0.5 || box.height < 0.5 || outside(box)) return;
    const replaced = REPLACED.has(element.tagName);
    const image = style.backgroundImage !== 'none' && style.backgroundImage !== '';
    const fill = color(style.backgroundColor);
    const edge = borders(style, box);
    const shadow = shadowOf(style.boxShadow);
    if (!replaced && !image && !fill && !edge.border && edge.sides.length === 0 && !shadow) return;
    if (image && !replaced) note('background images and gradients kept as pictures');
    items.push({ kind: 'box', ...box, fill: replaced ? null : fill, radius: radii(style, box), ...edge, shadow, raster: replaced || image, opacity, clip });
  };

  const SVG_PAINT = ['fill', 'fill-opacity', 'fill-rule', 'stroke', 'stroke-width', 'stroke-opacity', 'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray', 'opacity', 'font-family', 'font-size', 'font-weight', 'text-anchor', 'dominant-baseline', 'stop-color', 'stop-opacity', 'visibility'];

  const pushSvg = (element: SVGSVGElement, opacity: number, clip: number): void => {
    const box = local(element.getBoundingClientRect());
    if (box.width < 0.5 || box.height < 0.5 || outside(box)) return;
    const clone = element.cloneNode(true) as SVGSVGElement;
    const source = [element, ...Array.from(element.querySelectorAll('*'))];
    const target = [clone, ...Array.from(clone.querySelectorAll('*'))];
    source.forEach((node, index) => {
      const copy = target[index];
      if (!copy) return;
      const style = getComputedStyle(node);
      copy.removeAttribute('class');
      copy.setAttribute('style', SVG_PAINT.map((prop) => `${prop}:${style.getPropertyValue(prop)}`).join(';'));
    });
    if (!clone.getAttribute('viewBox')) clone.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
    for (const attr of ['x', 'y', 'width', 'height']) clone.setAttribute(attr, String(box[attr as 'x']));
    clone.removeAttribute('xmlns');
    items.push({ kind: 'svg', ...box, markup: new XMLSerializer().serializeToString(clone), opacity, clip });
  };

  const transformText = (text: string, mode: string): string => {
    if (mode === 'uppercase') return text.toUpperCase();
    if (mode === 'lowercase') return text.toLowerCase();
    if (mode === 'capitalize') return text.replace(/(^|\s)(\S)/g, (_, space: string, char: string) => space + char.toUpperCase());
    return text;
  };

  const familyList = (raw: string): string => raw.split(',').map((part) => part.trim()).filter(Boolean).join(', ');

  const blockOf = (element: Element): number => {
    let node: Element | null = element;
    while (node && node !== document.body) {
      const display = getComputedStyle(node).display;
      if (!display.startsWith('inline') || display === 'inline-block' || display === 'inline-flex' || display === 'inline-grid') break;
      node = node.parentElement;
    }
    const key = node ?? element;
    let id = blocks.get(key);
    if (id === undefined) {
      id = blocks.size;
      blocks.set(key, id);
    }
    return id;
  };

  const metrics = (font: string): { ascent: number; descent: number } => {
    if (!probe) return { ascent: 0, descent: 0 };
    probe.font = font;
    const measured = probe.measureText('Hg');
    return { ascent: measured.fontBoundingBoxAscent, descent: measured.fontBoundingBoxDescent };
  };

  const wordRects = (node: Text, preserve: boolean): { text: string; rect: DOMRect }[] => {
    const value = node.data;
    const out: { text: string; rect: DOMRect }[] = [];
    const pattern = preserve ? /[^\n]+/g : /\S+/g;
    const range = document.createRange();
    for (let match = pattern.exec(value); match; match = pattern.exec(value)) {
      range.setStart(node, match.index);
      range.setEnd(node, match.index + match[0].length);
      const rects = Array.from(range.getClientRects()).filter((rect) => rect.width > 0 && rect.height > 0);
      const [first] = rects;
      if (!first) continue;
      if (rects.length === 1 || preserve) out.push({ text: match[0], rect: first });
      else out.push({ text: match[0], rect: range.getBoundingClientRect() });
    }
    return out;
  };

  const groupLines = (words: { text: string; rect: DOMRect }[], baseOf: (rect: DOMRect) => number, preserve: boolean): ScanLine[] => {
    const lines: ScanLine[] = [];
    let current: { left: number; top: number; right: number; bottom: number; parts: string[]; rect: DOMRect } | null = null;
    const flush = (): void => {
      if (!current) return;
      const box = local({ x: current.left, y: current.top, width: current.right - current.left, height: current.bottom - current.top });
      lines.push({ ...box, text: current.parts.join(' '), baseline: round(baseOf(current.rect) + window.scrollY - region.y) });
    };
    for (const word of words) {
      const { rect } = word;
      const sameLine = current && !preserve && rect.top < current.bottom - rect.height / 2 && rect.left >= current.right - 1;
      if (current && sameLine) {
        current.parts.push(word.text);
        current.right = Math.max(current.right, rect.right);
        current.bottom = Math.max(current.bottom, rect.bottom);
        continue;
      }
      flush();
      current = { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, parts: [word.text], rect };
    }
    flush();
    return lines;
  };

  const pushText = (node: Text, parent: Element, opacity: number, clip: number): void => {
    if (!node.data.trim()) return;
    const style = getComputedStyle(parent);
    if (style.visibility === 'hidden') return;
    const paint = color(style.webkitTextFillColor || style.color) ?? color(style.color);
    if (!paint) return;
    const preserve = style.whiteSpace.startsWith('pre') || style.whiteSpace === 'break-spaces';
    const size = parseFloat(style.fontSize) || 16;
    const weight = parseInt(style.fontWeight, 10) || 400;
    const fontCss = `${style.fontStyle} ${weight} ${size}px ${style.fontFamily}`;
    const { ascent, descent } = metrics(fontCss);
    const baseOf = (rect: DOMRect): number => rect.top + (rect.height - (ascent + descent)) / 2 + ascent;
    const lines = groupLines(wordRects(node, preserve), baseOf, preserve)
      .filter((line) => !outside(line))
      .map((line) => ({ ...line, text: transformText(line.text, style.textTransform) }));
    if (lines.length === 0) return;
    const family = familyList(style.fontFamily);
    family.split(',').forEach((name) => usedFamilies.add(name.trim().replace(/^["']|["']$/g, '').toLowerCase()));
    const lineHeight = style.lineHeight === 'normal' ? size * 1.2 : parseFloat(style.lineHeight) || size * 1.2;
    const decoration = style.textDecorationLine;
    items.push({
      kind: 'text',
      lines,
      font: { family, size, weight, italic: style.fontStyle === 'italic' || style.fontStyle.startsWith('oblique') },
      color: paint,
      letterSpacing: style.letterSpacing === 'normal' ? 0 : parseFloat(style.letterSpacing) || 0,
      lineHeight,
      underline: decoration.includes('underline'),
      strike: decoration.includes('line-through'),
      align: style.textAlign,
      block: blockOf(parent),
      opacity,
      clip,
    });
  };

  const clipFor = (element: Element, style: CSSStyleDeclaration, parent: number): number => {
    if (style.overflowX === 'visible' && style.overflowY === 'visible') return parent;
    const box = local(element.getBoundingClientRect());
    const base = parent >= 0 ? clips[parent] : null;
    const area = base ? intersect(base, box) : box;
    clips.push({ ...area, radius: radii(style, box)[0], parent });
    return clips.length - 1;
  };

  const visit = (element: Element, parentOpacity: number, clip: number): void => {
    if (items.length >= options.maxItems) return;
    const style = getComputedStyle(element);
    if (style.display === 'none') return;
    const opacity = round(parentOpacity * (parseFloat(style.opacity) || 0));
    if (opacity < 0.01) return;
    if (element instanceof SVGSVGElement) {
      if (style.visibility !== 'hidden') pushSvg(element, opacity, clip);
      return;
    }
    if (element instanceof SVGElement) return;
    if (style.visibility !== 'hidden') pushBox(element, style, opacity, clip);
    if (REPLACED.has(element.tagName)) return;
    const inner = clipFor(element, style, clip);
    for (const child of Array.from(element.childNodes)) {
      if (child.nodeType === Node.ELEMENT_NODE) visit(child as Element, opacity, inner);
      else if (child.nodeType === Node.TEXT_NODE) pushText(child as Text, element, opacity, inner);
    }
  };

  const unquote = (raw: string): string | null => {
    let out = '';
    const pattern = /"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|attr\(\s*([\w-]+)\s*\)|counter\(\s*([\w-]+)\s*(?:,\s*([\w-]+)\s*)?\)|\s+/g;
    let last = 0;
    for (let match = pattern.exec(raw); match; match = pattern.exec(raw)) {
      if (match.index !== last) return null;
      last = match.index + match[0].length;
      if (match[1] !== undefined || match[2] !== undefined) out += (match[1] ?? match[2] ?? '').replace(/\\([0-9a-f]{1,6})\s?/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16))).replace(/\\(.)/g, '$1');
      else if (match[3]) out += '\u0000' + match[3] + '\u0000';
      else if (match[4]) out += '\u0001' + match[4] + ':' + (match[5] ?? 'decimal') + '\u0001';
    }
    return last === raw.length ? out : null;
  };

  const counterValue = (element: Element, name: string): number => {
    const step = (node: Element): number => {
      const raw = getComputedStyle(node).counterIncrement;
      if (name === 'list-item' && node.tagName === 'LI') return 1;
      const match = new RegExp(`(?:^|\\s)${name}(?:\\s+(-?\\d+))?(?:\\s|$)`).exec(raw);
      return match ? Number(match[1] ?? 1) : 0;
    };
    let value = step(element);
    for (let node = element.previousElementSibling; node; node = node.previousElementSibling) value += step(node);
    const reset = element.parentElement ? new RegExp(`(?:^|\\s)${name}\\s+(-?\\d+)`).exec(getComputedStyle(element.parentElement).counterReset) : null;
    return value + (reset ? Number(reset[1]) : 0);
  };

  const counterText = (value: number, kind: string): string => {
    if (kind === 'decimal-leading-zero') return String(value).padStart(2, '0');
    if (kind === 'lower-alpha' || kind === 'lower-latin') return String.fromCharCode(96 + value);
    if (kind === 'upper-alpha' || kind === 'upper-latin') return String.fromCharCode(64 + value);
    return String(value);
  };

  const materialize = (element: Element, which: '::before' | '::after'): boolean => {
    const style = getComputedStyle(element, which);
    const content = style.content;
    if (!content || content === 'none' || content === 'normal' || style.display === 'none') return false;
    const parsed = unquote(content);
    if (parsed === null) {
      note('some CSS-made text is kept only as a picture');
      element.setAttribute('data-ds-keep', `${element.getAttribute('data-ds-keep') ?? ''}${which === '::before' ? 'b' : 'a'}`);
      return false;
    }
    const text = parsed.replace(/\u0000([\w-]+)\u0000/g, (_, name: string) => element.getAttribute(name) ?? '').replace(/\u0001([\w-]+):([\w-]+)\u0001/g, (_, name: string, kind: string) => counterText(counterValue(element, name), kind));
    const span = document.createElement('span');
    const decls: string[] = [];
    for (let index = 0; index < style.length; index += 1) {
      const prop = style.item(index);
      if (prop === 'content' || prop.startsWith('--')) continue;
      decls.push(`${prop}:${style.getPropertyValue(prop)}`);
    }
    span.setAttribute('style', decls.join(';'));
    span.textContent = text;
    if (which === '::before') element.prepend(span);
    else element.append(span);
    return true;
  };

  const materializeAll = (scope: Element): void => {
    const marked: Element[] = [];
    const all = [scope, ...Array.from(scope.querySelectorAll('*'))].filter((element) => !(element instanceof SVGElement) && !REPLACED.has(element.tagName));
    const plan = all.map((element) => [element, getComputedStyle(element, '::before').content, getComputedStyle(element, '::after').content] as const).filter(([, before, after]) => (before !== 'none' && before !== 'normal') || (after !== 'none' && after !== 'normal'));
    for (const [element] of plan) {
      const before = materialize(element, '::before');
      const after = materialize(element, '::after');
      if (before || after) {
        element.setAttribute('data-ds-pseudo', `${before ? 'b' : ''}${after ? 'a' : ''}`);
        marked.push(element);
      }
    }
    if (marked.length === 0) return;
    const sheet = document.createElement('style');
    sheet.textContent = '[data-ds-pseudo*="b"]::before{content:none!important}[data-ds-pseudo*="a"]::after{content:none!important}';
    document.head.append(sheet);
  };

  const readBlob = (blob: Blob): Promise<string> => new Promise((done, fail) => {
    const reader = new FileReader();
    reader.onload = () => done(String(reader.result));
    reader.onerror = () => fail(reader.error);
    reader.readAsDataURL(blob);
  });

  const inlineFace = async (rule: CSSFontFaceRule, base: string, budget: { left: number }): Promise<string | null> => {
    let css = rule.cssText;
    const urls = Array.from(css.matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g));
    for (const match of urls) {
      const raw = match[2] ?? '';
      if (raw.startsWith('data:')) continue;
      try {
        const res = await fetch(new URL(raw, base).href, { credentials: 'omit' });
        if (!res.ok) return null;
        const blob = await res.blob();
        budget.left -= blob.size;
        if (budget.left < 0) return null;
        css = css.replace(match[0], `url("${await readBlob(blob)}")`);
      } catch {
        return null;
      }
    }
    return css;
  };

  const collectFaces = async (): Promise<string[]> => {
    const faces: string[] = [];
    const budget = { left: options.maxFontBytes };
    for (const sheet of Array.from(document.styleSheets)) {
      let rules: CSSRuleList;
      try {
        rules = sheet.cssRules;
      } catch {
        continue;
      }
      for (const rule of Array.from(rules)) {
        if (!(rule instanceof CSSFontFaceRule)) continue;
        const family = rule.style.getPropertyValue('font-family').trim().replace(/^["']|["']$/g, '').toLowerCase();
        if (!usedFamilies.has(family)) continue;
        const css = await inlineFace(rule, sheet.href ?? location.href, budget);
        if (css) faces.push(css);
        else note('web fonts named but not embedded');
      }
    }
    return faces;
  };

  const root = options.root ? document.querySelector(options.root) : document.body;
  if (!root) throw new Error('root not found');
  materializeAll(root);
  let opacity = 1;
  for (let node = root.parentElement; node; node = node.parentElement) opacity *= parseFloat(getComputedStyle(node).opacity) || 0;
  visit(root, opacity, -1);
  if (items.length >= options.maxItems) note('the page has too many elements; the rest were left out');
  const background = color(getComputedStyle(document.body).backgroundColor) ?? color(getComputedStyle(document.documentElement).backgroundColor);
  const fontFaces = options.embedFonts ? await collectFaces() : [];
  return {
    width: region.width,
    height: region.height,
    background,
    items,
    clips,
    fontFaces,
    notes: Array.from(notes.keys()),
  };
}

export function scanExpression(options: ScanOptions): string {
  return `(() => { const __name = (target) => target; return (${scanPage.toString()})(${JSON.stringify(options)}); })()`;
}
