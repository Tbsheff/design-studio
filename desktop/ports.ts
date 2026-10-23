import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { DEFAULT_PREVIEW_PORT, DEFAULT_STUDIO_PORT, DEFAULT_VITE_PORT_BASE } from '../src/shared/contracts.js';

export interface PortSet {
  studio: number;
  preview: number;
  viteBase: number;
}

export const VITE_PORT_RANGE = 200;
export const DEFAULT_PORTS: PortSet = { studio: DEFAULT_STUDIO_PORT, preview: DEFAULT_PREVIEW_PORT, viteBase: DEFAULT_VITE_PORT_BASE };
const FALLBACK_COUNT = 40;
const FALLBACK_STUDIO_START = 4570;
const FALLBACK_VITE_START = 8200;

export function portIsFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const probe = net.createServer();
    probe.unref();
    probe.once('error', () => resolve(false));
    probe.listen({ port, host: '127.0.0.1', exclusive: true }, () => {
      probe.close(() => resolve(true));
    });
  });
}

async function setIsFree(set: PortSet): Promise<boolean> {
  const ports = [set.studio, set.preview, set.viteBase];
  for (const port of ports) {
    if (!(await portIsFree(port))) return false;
  }
  return true;
}

export async function waitForFree(set: PortSet, ms: number): Promise<boolean> {
  const deadline = Date.now() + ms;
  while (!(await setIsFree(set))) {
    if (Date.now() > deadline) return false;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return true;
}

export function fallbackSets(): PortSet[] {
  return Array.from({ length: FALLBACK_COUNT }, (_, index) => ({
    studio: FALLBACK_STUDIO_START + index * 10,
    preview: FALLBACK_STUDIO_START + index * 10 + 1,
    viteBase: FALLBACK_VITE_START + index * VITE_PORT_RANGE,
  }));
}

function isPortSet(value: unknown): value is PortSet {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return ['studio', 'preview', 'viteBase'].every((key) => Number.isInteger(record[key]));
}

export function readSavedPorts(file: string): PortSet | null {
  try {
    const parsed: unknown = JSON.parse(readFileSync(file, 'utf8'));
    return isPortSet(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function savePorts(file: string, set: PortSet): void {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(set, null, 2)}\n`);
}

export async function pickPorts(saved: PortSet | null): Promise<PortSet> {
  const candidates = [...(saved ? [saved] : []), DEFAULT_PORTS, ...fallbackSets()];
  for (const candidate of candidates) {
    if (await setIsFree(candidate)) return candidate;
  }
  throw new Error('No free studio port pair found');
}
