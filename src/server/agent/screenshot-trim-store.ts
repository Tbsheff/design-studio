import { appendFile, mkdir, readFile, readdir, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { SessionKey, SessionStore, SessionStoreEntry } from '@anthropic-ai/claude-agent-sdk';

export const PROMPT_CACHE_TTL_MS = 5 * 60 * 1000;
export const OLD_SCREENSHOT_NOTE = '[A screenshot from an earlier run was here. It was removed to save context; take a new screenshot to see the page now.]';

interface Block {
  type?: string;
  content?: unknown;
}

function trimToolResult(block: Block): Block {
  if (block.type !== 'tool_result' || !Array.isArray(block.content)) return block;
  let removed = false;
  const content = (block.content as Block[]).filter((part) => {
    const image = part?.type === 'image';
    removed ||= image;
    return !image;
  });
  return removed ? { ...block, content: [...content, { type: 'text', text: OLD_SCREENSHOT_NOTE }] } : block;
}

export function withoutOldScreenshots(entry: SessionStoreEntry): SessionStoreEntry {
  const message = entry['message'] as { content?: unknown } | undefined;
  if (entry.type !== 'user' || !message || !Array.isArray(message.content)) return entry;
  return { ...entry, message: { ...message, content: (message.content as Block[]).map(trimToolResult) } };
}

async function findTranscript(projectsDir: string, key: SessionKey): Promise<string | null> {
  const name = `${key.sessionId}.jsonl`;
  const direct = path.join(projectsDir, key.projectKey, name);
  if (await stat(direct).then(() => true, () => false)) return direct;
  const dirs = await readdir(projectsDir).catch(() => [] as string[]);
  for (const dir of dirs) {
    const candidate = path.join(projectsDir, dir, name);
    if (await stat(candidate).then(() => true, () => false)) return candidate;
  }
  return null;
}

function parseEntries(text: string): SessionStoreEntry[] {
  return text
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => JSON.parse(line) as SessionStoreEntry);
}

export function createScreenshotTrimStore(claudeHome = path.join(os.homedir(), '.claude'), now: () => number = Date.now): SessionStore {
  const projectsDir = path.join(claudeHome, 'projects');
  const files = new Map<string, string>();
  const fileFor = async (key: SessionKey): Promise<string | null> => {
    const known = files.get(key.sessionId) ?? (await findTranscript(projectsDir, key));
    if (known) files.set(key.sessionId, known);
    return known;
  };
  return {
    append: async (key, entries) => {
      if (key.subpath || entries.length === 0) return;
      const file = (await fileFor(key)) ?? path.join(projectsDir, key.projectKey, `${key.sessionId}.jsonl`);
      await mkdir(path.dirname(file), { recursive: true });
      await appendFile(file, entries.map((entry) => `${JSON.stringify(entry)}\n`).join(''));
    },
    load: async (key) => {
      if (key.subpath) return null;
      const file = await fileFor(key);
      if (!file) return null;
      const [text, info] = await Promise.all([readFile(file, 'utf8'), stat(file)]);
      const entries = parseEntries(text);
      const cacheCold = now() - info.mtimeMs > PROMPT_CACHE_TTL_MS;
      return cacheCold ? entries.map(withoutOldScreenshots) : entries;
    },
  };
}
