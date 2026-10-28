import { readFile, stat } from 'node:fs/promises';
import { isIP } from 'node:net';
import path from 'node:path';
import { IMAGE_BYTES_MAX } from '../../shared/image.js';
import { DirectEditError } from './errors.js';

export interface ImageBytes {
  bytes: Buffer;
  ext: string;
  stem: string;
}

const FETCH_TIMEOUT_MS = 20_000;
const REDIRECTS_MAX = 4;
const MAX_TEXT = `${IMAGE_BYTES_MAX / 1024 / 1024} MB`;
const PRIVATE_V4 = /^(127\.|10\.|192\.168\.|169\.254\.|0\.|172\.(1[6-9]|2\d|3[01])\.)/;

function bad(message: string): DirectEditError {
  return new DirectEditError('invalid_request', message);
}

function startsWith(bytes: Buffer, signature: number[], at = 0): boolean {
  return signature.every((byte, index) => bytes[at + index] === byte);
}

function svgText(bytes: Buffer): string | null {
  const head = bytes.subarray(0, 2048).toString('utf8').replace(/^﻿/, '').trimStart();
  const body = head.replace(/^<\?xml[^>]*>\s*/, '').replace(/^(<!--[\s\S]*?-->\s*|<!DOCTYPE[^>]*>\s*)*/i, '');
  return /^<svg[\s>]/i.test(body) ? bytes.toString('utf8') : null;
}

function rasterExt(bytes: Buffer): string | null {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47])) return 'png';
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'jpg';
  if (startsWith(bytes, [0x47, 0x49, 0x46, 0x38])) return 'gif';
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && bytes.subarray(8, 12).toString('latin1') === 'WEBP') return 'webp';
  if (bytes.subarray(4, 8).toString('latin1') === 'ftyp' && /^avi[fs]$/.test(bytes.subarray(8, 12).toString('latin1'))) return 'avif';
  return null;
}

export function sniffImage(bytes: Buffer): string | null {
  const raster = rasterExt(bytes);
  if (raster) return raster;
  const svg = svgText(bytes);
  if (svg === null) return null;
  if (/<script|\son[a-z]+\s*=|javascript:|<foreignObject/i.test(svg)) throw bad('This SVG has scripts or event handlers, so the studio does not place it. Use a PNG, JPEG, WebP, AVIF or GIF, or an SVG without scripts.');
  return 'svg';
}

export function stemOf(name: string): string {
  const base = path.basename(name).replace(/\.[A-Za-z0-9]{1,5}$/, '');
  const stem = base.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/, '');
  return stem || 'image';
}

export function imageFromBytes(bytes: Buffer, name: string): ImageBytes {
  if (bytes.length === 0) throw bad('The image is empty.');
  if (bytes.length > IMAGE_BYTES_MAX) throw bad(`The image is larger than ${MAX_TEXT}.`);
  const ext = sniffImage(bytes);
  if (!ext) throw bad('This file is not an image the studio can place. Use PNG, JPEG, WebP, AVIF, GIF or SVG.');
  return { bytes, ext, stem: stemOf(name) };
}

export function imageFromBase64(data: string, name: string): ImageBytes {
  if (data.length > Math.ceil((IMAGE_BYTES_MAX * 4) / 3) + 4) throw bad(`The image is larger than ${MAX_TEXT}.`);
  return imageFromBytes(Buffer.from(data, 'base64'), name);
}

export async function imageFromPath(file: string): Promise<ImageBytes> {
  const info = await stat(file).catch(() => null);
  if (!info?.isFile()) throw bad(`${file} is not a file.`);
  if (info.size > IMAGE_BYTES_MAX) throw bad(`${path.basename(file)} is larger than ${MAX_TEXT}.`);
  return imageFromBytes(await readFile(file), path.basename(file));
}

function checkUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw bad(`${raw.slice(0, 200)} is not a URL.`);
  }
  if (url.protocol !== 'https:') throw bad('Image URLs must use https.');
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  const local = host === 'localhost' || host.endsWith('.localhost') || (isIP(host) === 4 && PRIVATE_V4.test(host)) || (isIP(host) === 6 && /^(::1?$|f[cd]|fe80)/.test(host));
  if (local) throw bad('Image URLs must point to a public host.');
  return url;
}

async function readCapped(response: Response): Promise<Buffer> {
  const declared = Number(response.headers.get('content-length') ?? '0');
  if (declared > IMAGE_BYTES_MAX) throw bad(`The image is larger than ${MAX_TEXT}.`);
  if (!response.body) return Buffer.alloc(0);
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
    total += chunk.length;
    if (total > IMAGE_BYTES_MAX) throw bad(`The image is larger than ${MAX_TEXT}.`);
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function follow(start: URL, signal: AbortSignal): Promise<{ response: Response; url: URL }> {
  let url = start;
  for (let hop = 0; hop <= REDIRECTS_MAX; hop += 1) {
    const response = await fetch(url, { redirect: 'manual', signal, headers: { accept: 'image/*' } });
    const location = response.headers.get('location');
    if (response.status < 300 || response.status >= 400 || !location) return { response, url };
    await response.body?.cancel().catch(() => undefined);
    url = checkUrl(new URL(location, url).toString());
  }
  throw bad('The image URL redirects too many times.');
}

export async function imageFromUrl(raw: string): Promise<ImageBytes> {
  const signal = AbortSignal.timeout(FETCH_TIMEOUT_MS);
  let fetched: { response: Response; url: URL };
  try {
    fetched = await follow(checkUrl(raw), signal);
  } catch (error) {
    if (error instanceof DirectEditError) throw error;
    throw bad(`The image could not be fetched: ${error instanceof Error ? error.message : String(error)}`);
  }
  const { response, url } = fetched;
  if (!response.ok) throw bad(`The image URL answered ${response.status}.`);
  const type = (response.headers.get('content-type') ?? '').toLowerCase();
  if (!type.startsWith('image/')) throw bad(`The URL is not an image (content type ${type || 'unknown'}).`);
  const bytes = await readCapped(response).catch((error: unknown) => {
    if (error instanceof DirectEditError) throw error;
    throw bad(`The image download stopped: ${error instanceof Error ? error.message : String(error)}`);
  });
  return imageFromBytes(bytes, url.pathname.split('/').pop() ?? 'image');
}
