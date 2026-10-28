import { randomBytes } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { McpActivity } from '../../shared/contracts.js';
import { assertSafeId } from '../store/errors.js';
import type { EventBus } from '../types.js';

export const ACTIVITY_KEEP = 200;
const FILE = 'mcp-activity.json';
const SUMMARY_MAX = 140;

export interface ActivityDraft {
  projectId: string;
  directionId: string | null;
  summary: string;
  versionId?: string | null;
  beforeVersionId?: string | null;
  frameId?: string | null;
}

export interface ActivityLog {
  record(tool: string, client: string, draft: ActivityDraft): Promise<McpActivity>;
  list(projectId: string): Promise<McpActivity[]>;
  remap(projectId: string, remapped: Record<string, { id: string; parentId: string }>): Promise<void>;
}

function clean(text: string, max: number): string {
  const flat = text.replace(/[\p{Cc}\s]+/gu, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

function isActivity(value: unknown): value is McpActivity {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Partial<McpActivity>;
  return typeof item.id === 'string' && typeof item.summary === 'string' && typeof item.at === 'number' && typeof item.client === 'string';
}

export function createActivityLog(dataDir: string, bus: EventBus): ActivityLog {
  const cache = new Map<string, McpActivity[]>();
  const chains = new Map<string, Promise<unknown>>();
  const fileOf = (projectId: string) => path.join(dataDir, 'projects', assertSafeId(projectId, 'projectId'), FILE);

  const load = async (projectId: string): Promise<McpActivity[]> => {
    const cached = cache.get(projectId);
    if (cached) return cached;
    const parsed: unknown = JSON.parse(await readFile(fileOf(projectId), 'utf8').catch(() => '[]'));
    const items = Array.isArray(parsed) ? parsed.filter(isActivity).slice(-ACTIVITY_KEEP) : [];
    cache.set(projectId, items);
    return items;
  };

  const save = async (projectId: string, items: McpActivity[]): Promise<void> => {
    const file = fileOf(projectId);
    await mkdir(path.dirname(file), { recursive: true });
    const temp = `${file}.tmp-${randomBytes(4).toString('hex')}`;
    await writeFile(temp, JSON.stringify(items));
    await rename(temp, file);
  };

  const serial = <T>(projectId: string, fn: () => Promise<T>): Promise<T> => {
    const next = (chains.get(projectId) ?? Promise.resolve()).catch(() => undefined).then(fn);
    chains.set(projectId, next);
    return next;
  };

  return {
    record(tool, client, draft) {
      return serial(draft.projectId, async () => {
        const activity: McpActivity = {
          id: randomBytes(9).toString('base64url'),
          projectId: draft.projectId,
          directionId: draft.directionId,
          tool,
          client,
          summary: clean(draft.summary, SUMMARY_MAX),
          versionId: draft.versionId ?? null,
          beforeVersionId: draft.beforeVersionId ?? null,
          frameId: draft.frameId ?? null,
          at: Date.now(),
        };
        const items = [...(await load(draft.projectId)), activity].slice(-ACTIVITY_KEEP);
        cache.set(draft.projectId, items);
        await save(draft.projectId, items);
        bus.emit({ type: 'mcp.activity', projectId: draft.projectId, ...(draft.directionId ? { directionId: draft.directionId } : {}), activity });
        return activity;
      });
    },
    list: (projectId) => serial(projectId, () => load(projectId)),
    remap: (projectId, remapped) =>
      serial(projectId, async () => {
        const items = (await load(projectId)).map((item) => {
          const moved = item.versionId ? remapped[item.versionId] : undefined;
          return moved ? { ...item, versionId: moved.id, beforeVersionId: moved.parentId } : item;
        });
        cache.set(projectId, items);
        await save(projectId, items);
      }),
  };
}
