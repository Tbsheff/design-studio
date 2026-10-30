import { readFileSync, statSync } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

interface WriteStart {
  relative: string;
  absolute: string;
  bytes: Uint8Array | null;
}

function readStart(absolute: string): Uint8Array | null {
  try {
    return statSync(absolute).isFile() ? readFileSync(absolute) : null;
  } catch {
    return null;
  }
}

function sameBytes(a: Uint8Array | null, b: Uint8Array | null): boolean {
  if (a === null || b === null) return a === b;
  return Buffer.from(a).equals(Buffer.from(b));
}

export function createCutWriteGuard() {
  const open = new Map<string, WriteStart>();
  const cut = new Map<string, WriteStart>();

  return {
    start(toolUseId: string, relative: string, absolute: string): void {
      if (!open.has(toolUseId)) open.set(toolUseId, { relative, absolute, bytes: readStart(absolute) });
    },

    finish(toolUseId: string, isError: boolean): void {
      const entry = open.get(toolUseId);
      if (!entry) return;
      open.delete(toolUseId);
      if (!isError) cut.delete(entry.relative);
      else if (!cut.has(entry.relative)) cut.set(entry.relative, entry);
    },

    async restore(): Promise<string[]> {
      const entries = new Map(cut);
      for (const entry of open.values()) if (!entries.has(entry.relative)) entries.set(entry.relative, entry);
      open.clear();
      cut.clear();
      const restored: string[] = [];
      for (const entry of entries.values()) {
        if (sameBytes(readStart(entry.absolute), entry.bytes)) continue;
        if (entry.bytes === null) await rm(entry.absolute, { force: true });
        else {
          await mkdir(path.dirname(entry.absolute), { recursive: true });
          await writeFile(entry.absolute, entry.bytes);
        }
        restored.push(entry.relative);
      }
      return restored;
    },
  };
}
