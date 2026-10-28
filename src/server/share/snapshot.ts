import { mkdir, writeFile } from 'node:fs/promises';
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

export async function captureShare(preview: PreviewService, source: ExportSource, frames: ExportFrame[], dir: string): Promise<ShareFrame[]> {
  await mkdir(dir, { recursive: true, mode: 0o700 });
  const opened = await source.open();
  try {
    const out: ShareFrame[] = [];
    for (const [index, frame] of frames.entries()) {
      const shot = await captureFrame(preview, opened.url, frame, frame.width <= 800 ? 2 : 1, 'page', undefined, MAX_CSS_HEIGHT);
      await writeFile(frameFile(dir, index), shot.png, { mode: 0o600 });
      out.push({ name: frame.name, width: frame.width, height: frame.height, ...(frame.path ? { path: frame.path } : {}), cssHeight: shot.cssHeight });
    }
    return out;
  } finally {
    await opened.release().catch(() => undefined);
  }
}
