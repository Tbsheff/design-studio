import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { PNG } from 'pngjs';
import type { Attachment } from '../../shared/contracts.js';
import { isReferenceName, plainAttachmentName, REFERENCE_LOW_SCORE, REFERENCE_MAX_WIDTH, type ReferenceRecord, type ReferenceScore } from '../../shared/reference.js';
import type { AgentRunContext, PreviewService } from '../types.js';
import { diffPictures, pictureSheet, resizePng, topOf } from '../preview/visual-diff.js';
import { defaultShotTarget } from './run-target.js';
import type { ImagePart } from './user-message.js';

const MAX_HEIGHT = 4000;

interface Size {
  width: number;
  height: number;
}

function pngSize(bytes: Buffer): Size | null {
  return bytes.length > 24 && bytes.readUInt32BE(12) === 0x49484452 ? { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) } : null;
}

function gifSize(bytes: Buffer): Size | null {
  return bytes.length > 10 && bytes.toString('ascii', 0, 3) === 'GIF' ? { width: bytes.readUInt16LE(6), height: bytes.readUInt16LE(8) } : null;
}

function jpegSize(bytes: Buffer): Size | null {
  let at = 2;
  while (at + 9 < bytes.length && bytes[at] === 0xff) {
    const marker = bytes[at + 1] ?? 0;
    const length = bytes.readUInt16BE(at + 2);
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) return { height: bytes.readUInt16BE(at + 5), width: bytes.readUInt16BE(at + 7) };
    at += 2 + length;
  }
  return null;
}

function webpSize(bytes: Buffer): Size | null {
  if (bytes.length < 30 || bytes.toString('ascii', 8, 12) !== 'WEBP') return null;
  const chunk = bytes.toString('ascii', 12, 16);
  if (chunk === 'VP8X') return { width: 1 + bytes.readUIntLE(24, 3), height: 1 + bytes.readUIntLE(27, 3) };
  if (chunk === 'VP8L') {
    const bits = bytes.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (chunk === 'VP8 ') return { width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff };
  return null;
}

export function pictureSize(bytes: Buffer, mime: string): Size | null {
  if (mime === 'image/png') return pngSize(bytes);
  if (mime === 'image/gif') return gifSize(bytes);
  if (mime === 'image/jpeg') return jpegSize(bytes);
  if (mime === 'image/webp') return webpSize(bytes);
  return null;
}

export function mimeOfPath(file: string): string | null {
  const ext = path.extname(file).slice(1).toLowerCase();
  const map: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp' };
  return map[ext] ?? null;
}

export function renderSize(natural: Size, frameWidth?: number): Size {
  const width = frameWidth ?? Math.round(natural.width / Math.ceil(natural.width / REFERENCE_MAX_WIDTH));
  return { width, height: Math.max(1, Math.min(MAX_HEIGHT, Math.round((natural.height * width) / natural.width))) };
}

async function decodeInBrowser(preview: PreviewService, file: string, size: Size, scratch: string): Promise<PNG> {
  const page = `${scratch}-decode.html`;
  const out = `${scratch}-decoded.png`;
  const src = pathToFileURL(file).href;
  await writeFile(page, `<!doctype html><style>html,body{margin:0;background:#fff}img{display:block;width:${size.width}px;height:${size.height}px}</style><img src="${src}">`);
  try {
    await preview.screenshot(pathToFileURL(page).href, size, out);
    return topOf(PNG.sync.read(await readFile(out)), size.height);
  } finally {
    await Promise.all([rm(page, { force: true }), rm(out, { force: true })]);
  }
}

async function loadReference(preview: PreviewService, file: string, mime: string, frameWidth: number | undefined, scratch: string): Promise<PNG> {
  const bytes = await readFile(file);
  const natural = pictureSize(bytes, mime);
  if (!natural || natural.width < 1 || natural.height < 1) throw new Error(`${path.basename(file)} is not a PNG, JPEG, GIF or WebP picture the studio can read.`);
  const size = renderSize(natural, frameWidth);
  if (mime === 'image/png') {
    const png = PNG.sync.read(bytes);
    return png.width === size.width && png.height === size.height ? png : resizePng(png, size.width, size.height);
  }
  return decodeInBrowser(preview, file, size, scratch);
}

export interface CompareInput {
  preview: PreviewService;
  url: string;
  file: string;
  mime: string;
  frameWidth?: number;
  outDir: string;
  stem: string;
}

export async function compareToReference(input: CompareInput): Promise<ReferenceScore> {
  const started = Date.now();
  await mkdir(input.outDir, { recursive: true });
  const scratch = path.join(input.outDir, input.stem);
  const reference = await loadReference(input.preview, input.file, input.mime, input.frameWidth, scratch);
  const renderPath = `${scratch}-render.png`;
  await input.preview.screenshot(input.url, { width: reference.width, height: reference.height }, renderPath);
  const shot = topOf(PNG.sync.read(await readFile(renderPath)), reference.height);
  const render = shot.width === reference.width && shot.height === reference.height ? shot : resizePng(shot, reference.width, reference.height);
  const diff = diffPictures(reference, render);
  const diffPath = `${scratch}-diff.png`;
  await writeFile(diffPath, pictureSheet(reference, render, diff));
  return { score: Math.max(0, Math.round(100 - diff.differsPct)), width: reference.width, height: reference.height, differsPct: diff.differsPct, regions: diff.regions, diffPath, renderPath, ms: Date.now() - started };
}

export function scoreLines(score: ReferenceScore, listed = 4): string[] {
  const worst = score.regions.filter((region) => region.differsPct >= 5).slice(0, listed);
  return worst.map((region) => `- ${region.name} (x ${region.x}-${region.x + region.width}, y ${region.y}-${region.y + region.height}): ${region.differsPct}% of pixels differ`);
}

export function referenceAttachment(attachments: readonly Attachment[]): Attachment | null {
  return attachments.find((attachment) => isReferenceName(attachment.name)) ?? null;
}

export function referenceFixPrompt(score: ReferenceScore, name: string): string {
  return [
    '<studio-continue>',
    `The user marked ${name} as the reference picture. The studio rendered the frame at ${score.width}x${score.height} and compared it with the picture: match score ${score.score}/100 (${score.differsPct}% of pixels differ; the bar is ${REFERENCE_LOW_SCORE}).`,
    'The attached sheet shows, left to right: the reference, your render, and your render with the different pixels in red.',
    'The areas that differ most:',
    ...scoreLines(score),
    'Do one fix loop: make the layout, spacing, sizes, colors and type of the frame match the reference more closely, with the project kit and tokens. Do not copy text that is not in the picture. Then call mcp__studio__compare_to_reference once and reply in one or two sentences with the new score and what is still different.',
    '</studio-continue>',
  ].join('\n');
}

export type ReferenceContinue = (text: string, images: ImagePart[]) => Promise<boolean>;

export interface ReferencePassInput {
  preview: PreviewService;
  ctx: AgentRunContext;
  runsDir: string;
  runId: string;
  continueWith?: ReferenceContinue;
}

function passTarget(input: ReferencePassInput): { url: string; attachment: Attachment; frameWidth?: number } | null {
  if (input.ctx.request.mode !== 'edit') return null;
  const attachment = referenceAttachment(input.ctx.attachments);
  const url = defaultShotTarget(input.ctx)?.url;
  if (!attachment || !url) return null;
  const frameWidth = input.ctx.target?.width;
  return { url, attachment, ...(frameWidth ? { frameWidth } : {}) };
}

async function sheetImage(score: ReferenceScore): Promise<ImagePart> {
  return { mime: 'image/png', data: (await readFile(score.diffPath)).toString('base64'), name: 'reference-diff.png' };
}

export async function runReferencePass(input: ReferencePassInput): Promise<ReferenceRecord | null> {
  const target = passTarget(input);
  if (!target) return null;
  const name = plainAttachmentName(target.attachment.name);
  const compare = (stem: string) => compareToReference({ preview: input.preview, url: target.url, file: target.attachment.path, mime: target.attachment.mime, ...(target.frameWidth ? { frameWidth: target.frameWidth } : {}), outDir: input.runsDir, stem: `${input.runId}-${stem}` });
  try {
    const first = await compare('reference');
    const record: ReferenceRecord = { score: first.score, fixLoop: false, diffPath: first.diffPath, name };
    if (first.score >= REFERENCE_LOW_SCORE || !input.continueWith) return record;
    const ran = await input.continueWith(referenceFixPrompt(first, name), [await sheetImage(first)]);
    if (!ran) return record;
    const second = await compare('reference-after');
    return { score: second.score, before: first.score, fixLoop: true, diffPath: second.diffPath, name };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[agent] reference check failed: ${message}`);
    return { score: null, fixLoop: false, name, error: message.slice(0, 300) };
  }
}
