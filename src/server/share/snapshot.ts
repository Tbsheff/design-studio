import { randomBytes } from 'node:crypto';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { ExportFrame } from '../../shared/export.js';
import type { ShareFrame } from '../../shared/share.js';
import { captureFrame } from '../export/capture.js';
import type { ExportSource } from '../export/source.js';
import type { PreviewService } from '../types.js';

const MAX_CSS_HEIGHT = 8000;

export function frameFile(dir: string, index: number): string {
  return path.join(dir, `${index}.png`);
}

async function writeAtomic(file: string, png: Uint8Array): Promise<void> {
  const temp = `${file}.${randomBytes(4).toString('hex')}.tmp`;
  await writeFile(temp, png, { mode: 0o600 });
  await rename(temp, file);
}

export async function captureShare(preview: PreviewService, source: ExportSource, frames: ExportFrame[], dir: string, ids: (string | undefined)[] = []): Promise<ShareFrame[]> {
  await mkdir(dir, { recursive: true, mode: 0o700 });
  const opened = await source.open();
  try {
    const shots = await Promise.all(frames.map((frame) => captureFrame(preview, opened.url, frame, frame.width <= 800 ? 2 : 1, 'page', undefined, MAX_CSS_HEIGHT)));
    await Promise.all(shots.map((shot, index) => writeAtomic(frameFile(dir, index), shot.png)));
    return frames.map((frame, index) => ({ name: frame.name, width: frame.width, height: frame.height, ...(frame.path ? { path: frame.path } : {}), cssHeight: shots[index]?.cssHeight ?? frame.height, ...(ids[index] ? { id: ids[index] } : {}) }));
  } finally {
    await opened.release().catch(() => undefined);
  }
}
