import { randomBytes } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { DEFAULT_SHIP_SETTINGS, SHIP_MODES, SHIP_TEXT_MAX, type ShipRecord, type ShipSettings } from '../../shared/ship.js';

const FILE = 'ship.json';
const HISTORY_KEEP = 20;

export const shipSettingsSchema = z
  .object({
    user: z.string().trim().max(SHIP_TEXT_MAX.user).regex(/^[A-Za-z0-9._-]*$/, 'user may hold only letters, digits, . _ and -'),
    branchTemplate: z.string().trim().min(1).max(SHIP_TEXT_MAX.branchTemplate),
    bodyTemplate: z.string().max(SHIP_TEXT_MAX.bodyTemplate),
    issueId: z.string().trim().max(SHIP_TEXT_MAX.issueId).regex(/^[A-Za-z0-9._#-]*$/, 'issue id may hold only letters, digits, . _ # and -'),
  })
  .strict();

const recordSchema = z.object({
  versionId: z.string(),
  baseVersionId: z.string(),
  branch: z.string(),
  sha: z.string(),
  mode: z.enum(SHIP_MODES as [string, ...string[]]),
  pushed: z.boolean(),
  prUrl: z.string().nullable(),
  files: z.number(),
  at: z.number(),
});

export interface ShipState {
  settings: ShipSettings;
  history: ShipRecord[];
}

const fileOf = (projectDir: string) => path.join(projectDir, FILE);

export async function readShipState(projectDir: string): Promise<ShipState> {
  const parsed: unknown = JSON.parse(await readFile(fileOf(projectDir), 'utf8').catch(() => '{}'));
  const raw = (typeof parsed === 'object' && parsed !== null ? parsed : {}) as { settings?: unknown; history?: unknown };
  const settings = shipSettingsSchema.safeParse({ ...DEFAULT_SHIP_SETTINGS, ...(typeof raw.settings === 'object' && raw.settings !== null ? raw.settings : {}) });
  const history = Array.isArray(raw.history) ? raw.history.flatMap((item) => { const ok = recordSchema.safeParse(item); return ok.success ? [ok.data as ShipRecord] : []; }) : [];
  return { settings: settings.success ? settings.data : { ...DEFAULT_SHIP_SETTINGS }, history: history.slice(-HISTORY_KEEP) };
}

async function writeShipState(projectDir: string, state: ShipState): Promise<void> {
  const file = fileOf(projectDir);
  await mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.tmp-${randomBytes(4).toString('hex')}`;
  await writeFile(temp, `${JSON.stringify(state, null, 2)}\n`);
  await rename(temp, file);
}

export async function saveShipSettings(projectDir: string, settings: ShipSettings): Promise<ShipSettings> {
  const state = await readShipState(projectDir);
  await writeShipState(projectDir, { ...state, settings });
  return settings;
}

export async function addShipRecord(projectDir: string, record: ShipRecord): Promise<void> {
  const state = await readShipState(projectDir);
  await writeShipState(projectDir, { ...state, history: [...state.history, record].slice(-HISTORY_KEEP) });
}
