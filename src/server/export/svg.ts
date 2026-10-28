import { PNG } from 'pngjs';
import type { ScanBox, ScanClip, ScanColor, ScanItem, ScanRect, ScanSvg, ScanText } from './page-scan.js';
import { cropPng, type VectorRegion } from './vector.js';

const n = (value: number): string => String(Math.round(value * 100) / 100);

export function xml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char] ?? char).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
}

function paint(attr: 'fill' | 'stroke', color: ScanColor | null): string {
  if (!color) return ` ${attr}="none"`;
  return ` ${attr}="#${color.hex}"${color.alpha < 1 ? ` ${attr}-opacity="${n(color.alpha)}"` : ''}`;
}

function roundedPath(box: ScanRect, radius: [number, number, number, number]): string {
  const [tl, tr, br, bl] = radius;
  const { x, y, width: w, height: h } = box;
  return `M${n(x + tl)} ${n(y)}H${n(x + w - tr)}A${n(tr)} ${n(tr)} 0 0 1 ${n(x + w)} ${n(y + tr)}V${n(y + h - br)}A${n(br)} ${n(br)} 0 0 1 ${n(x + w - br)} ${n(y + h)}H${n(x + bl)}A${n(bl)} ${n(bl)} 0 0 1 ${n(x)} ${n(y + h - bl)}V${n(y + tl)}A${n(tl)} ${n(tl)} 0 0 1 ${n(x + tl)} ${n(y)}Z`;
}

function shape(box: ScanRect, radius: [number, number, number, number], attrs: string): string {
  const [tl] = radius;
  if (radius.every((r) => r === tl)) return `<rect x="${n(box.x)}" y="${n(box.y)}" width="${n(box.width)}" height="${n(box.height)}"${tl > 0 ? ` rx="${n(tl)}"` : ''}${attrs}/>`;
  return `<path d="${roundedPath(box, radius)}"${attrs}/>`;
}

class SvgWriter {
  readonly defs: string[] = [];
  readonly body: string[] = [];
  private ids = 0;
  private readonly clipIds = new Map<number, string>();
  private source: PNG | null = null;

  constructor(
    private readonly region: VectorRegion,
    private readonly clips: ScanClip[],
  ) {}

  private id(prefix: string): string {
    this.ids += 1;
    return `${prefix}${this.ids}`;
  }

  private clipAttr(index: number): string {
    if (index < 0) return '';
    let id = this.clipIds.get(index);
    if (!id) {
      const clip = this.clips[index];
      if (!clip) return '';
      id = this.id('c');
      this.clipIds.set(index, id);
      this.defs.push(`<clipPath id="${id}">${shape(clip, [clip.radius, clip.radius, clip.radius, clip.radius], '')}</clipPath>`);
    }
    return ` clip-path="url(#${id})"`;
  }

  private wrap(inner: string, clip: number, opacity: number): string {
    const clipAttr = this.clipAttr(clip);
    if (!clipAttr && opacity >= 1) return inner;
    return `<g${clipAttr}${opacity < 1 ? ` opacity="${n(opacity)}"` : ''}>${inner}</g>`;
  }

  private raster(box: ScanBox): string {
    this.source ??= PNG.sync.read(this.region.png);
    const crop = cropPng(this.source, box, this.region.scale);
    if (!crop) return '';
    const rounded = box.radius.some((r) => r > 0);
    let clip = '';
    if (rounded) {
      const id = this.id('r');
      this.defs.push(`<clipPath id="${id}">${shape(box, box.radius, '')}</clipPath>`);
      clip = ` clip-path="url(#${id})"`;
    }
    return `<image x="${n(box.x)}" y="${n(box.y)}" width="${n(box.width)}" height="${n(box.height)}" preserveAspectRatio="none"${clip} xlink:href="data:image/png;base64,${crop.toString('base64')}"/>`;
  }

  private shadow(box: ScanBox): string {
    if (!box.shadow || !box.fill) return '';
    const id = this.id('s');
    const { dx, dy, blur, color } = box.shadow;
    this.defs.push(`<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="${n(dx)}" dy="${n(dy)}" stdDeviation="${n(blur / 2)}" flood-color="#${color.hex}" flood-opacity="${n(color.alpha)}"/></filter>`);
    return ` filter="url(#${id})"`;
  }

  box(box: ScanBox): void {
    const parts: string[] = [];
    if (box.raster) parts.push(this.raster(box));
    else if (box.fill || box.shadow) parts.push(shape(box, box.radius, `${paint('fill', box.fill)}${this.shadow(box)}`));
    if (box.border) {
      const half = box.border.width / 2;
      const inset = { x: box.x + half, y: box.y + half, width: Math.max(0, box.width - box.border.width), height: Math.max(0, box.height - box.border.width) };
      const radius = box.radius.map((r) => Math.max(0, r - half)) as [number, number, number, number];
      parts.push(shape(inset, radius, ` fill="none"${paint('stroke', box.border.color)} stroke-width="${n(box.border.width)}"${box.border.dashed ? ` stroke-dasharray="${n(box.border.width * 3)} ${n(box.border.width * 2)}"` : ''}`));
    }
    for (const side of box.sides) parts.push(`<rect x="${n(side.x)}" y="${n(side.y)}" width="${n(side.width)}" height="${n(side.height)}"${paint('fill', side.color)}/>`);
    const inner = parts.join('');
    if (inner) this.body.push(this.wrap(inner, box.clip, box.opacity));
  }

  text(text: ScanText): void {
    const { font } = text;
    const attrs = [
      ` font-family="${xml(font.family)}"`,
      ` font-size="${n(font.size)}"`,
      font.weight !== 400 ? ` font-weight="${font.weight}"` : '',
      font.italic ? ' font-style="italic"' : '',
      text.letterSpacing ? ` letter-spacing="${n(text.letterSpacing)}"` : '',
      text.underline || text.strike ? ` text-decoration="${text.underline ? 'underline' : 'line-through'}"` : '',
      paint('fill', text.color),
    ].join('');
    const lines = text.lines.map((line) => `<text x="${n(line.x)}" y="${n(line.baseline)}">${xml(line.text)}</text>`).join('');
    this.body.push(this.wrap(`<g${attrs} xml:space="preserve">${lines}</g>`, text.clip, text.opacity));
  }

  svg(item: ScanSvg): void {
    this.body.push(this.wrap(item.markup, item.clip, item.opacity));
  }

  item(item: ScanItem): void {
    if (item.kind === 'box') this.box(item);
    else if (item.kind === 'text') this.text(item);
    else this.svg(item);
  }
}

export function buildSvg(region: VectorRegion, options: { background: boolean; title: string }): string {
  const { scan } = region;
  const writer = new SvgWriter(region, scan.clips);
  for (const item of scan.items) writer.item(item);
  const fonts = scan.fontFaces.length > 0 ? `<style>${xml(scan.fontFaces.join('\n'))}</style>` : '';
  const defs = fonts || writer.defs.length > 0 ? `<defs>${fonts}${writer.defs.join('')}</defs>` : '';
  const backdrop = options.background && scan.background ? `<rect width="100%" height="100%"${paint('fill', scan.background)}/>` : '';
  return [
    '<?xml version="1.0" encoding="UTF-8"?>\n',
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${n(scan.width)}" height="${n(scan.height)}" viewBox="0 0 ${n(scan.width)} ${n(scan.height)}">`,
    `<title>${xml(options.title)}</title>`,
    defs,
    backdrop,
    writer.body.join('\n'),
    '</svg>\n',
  ].join('');
}
