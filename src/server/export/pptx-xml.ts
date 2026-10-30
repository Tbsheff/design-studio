import type { ScanColor, ScanGradient, ScanShadow } from './page-scan.js';

export interface XmlPatch {
  fill?: string;
  effect?: string;
  geom?: string;
}

const EMU_PER_PX = 914400 / 96;
const SLIDE = /^ppt\/slides\/slide\d+\.xml$/;
const BLOCK = /<p:(sp|pic)>[\s\S]*?<\/p:\1>/g;
const FILL = /^(<a:solidFill>[\s\S]*?<\/a:solidFill>|<a:noFill\/>)/;

function colorXml(color: ScanColor, opacity: number): string {
  const alpha = color.alpha * opacity;
  return `<a:srgbClr val="${color.hex.toUpperCase()}">${alpha < 0.99 ? `<a:alpha val="${Math.round(alpha * 100000)}"/>` : ''}</a:srgbClr>`;
}

export function gradientXml(gradient: ScanGradient, opacity: number): string {
  const stops = gradient.stops.map((stop) => `<a:gs pos="${Math.round(stop.pos * 100000)}">${colorXml(stop.color, opacity)}</a:gs>`).join('');
  const angle = (((gradient.angle - 90) % 360) + 360) % 360;
  return `<a:gradFill rotWithShape="1"><a:gsLst>${stops}</a:gsLst><a:lin ang="${Math.round(angle * 60000)}" scaled="0"/></a:gradFill>`;
}

export function shadowXml(shadow: ScanShadow, box: { width: number; height: number }, k: number, opacity: number): string {
  const emu = (px: number): number => Math.round(Math.max(0, px) * k * EMU_PER_PX);
  const dist = Math.hypot(shadow.dx, shadow.dy);
  const dir = dist > 0 ? ((((Math.atan2(shadow.dy, shadow.dx) * 180) / Math.PI) % 360) + 360) % 360 : 0;
  const scale = (side: number): number => Math.round((Math.max(1, side + shadow.spread * 2) / Math.max(1, side)) * 100000);
  return `<a:effectLst><a:outerShdw blurRad="${emu(shadow.blur)}" dist="${emu(dist)}" dir="${Math.round(dir * 60000)}" sx="${scale(box.width)}" sy="${scale(box.height)}" algn="ctr" rotWithShape="0">${colorXml(shadow.color, opacity)}</a:outerShdw></a:effectLst>`;
}

export function roundGeomXml(radius: number, box: { width: number; height: number }): string {
  const adj = Math.round(Math.min(50000, (radius / Math.max(1, Math.min(box.width, box.height))) * 100000));
  return `<a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val ${adj}"/></a:avLst></a:prstGeom>`;
}

function patchShape(block: string, patch: XmlPatch): string {
  let out = block;
  if (patch.fill) {
    const close = Math.max(out.indexOf('</a:prstGeom>') + '</a:prstGeom>'.length, out.indexOf('</a:custGeom>') + '</a:custGeom>'.length);
    if (close > 20) out = out.slice(0, close) + out.slice(close).replace(FILL, patch.fill);
  }
  if (patch.geom) out = out.replace(/<a:prstGeom prst="rect">\s*<a:avLst\/>\s*<\/a:prstGeom>/, patch.geom);
  if (patch.effect) out = out.replace(/<a:effectLst\/>|<a:effectLst>[\s\S]*?<\/a:effectLst>/, '').replace('</p:spPr>', `${patch.effect}</p:spPr>`);
  return out;
}

function patchSlide(xml: string, patches: Map<string, XmlPatch>): string {
  return xml.replace(BLOCK, (block) => {
    const name = /<p:cNvPr id="\d+" name="(ds-\d+)"/.exec(block)?.[1];
    const patch = name ? patches.get(name) : undefined;
    return patch ? patchShape(block, patch) : block;
  });
}

export async function patchDeck(bytes: Buffer, patches: Map<string, XmlPatch>): Promise<Buffer> {
  if (patches.size === 0) return bytes;
  const { default: JSZip } = await import('jszip');
  const zip = await JSZip.loadAsync(bytes);
  for (const name of Object.keys(zip.files)) {
    const file = zip.files[name];
    if (!file || file.dir || !SLIDE.test(name)) continue;
    zip.file(name, patchSlide(await file.async('string'), patches));
  }
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
}
