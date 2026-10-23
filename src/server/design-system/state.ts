import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { CompiledTokenEntry, DesignSystemState, Direction, Project } from '../../shared/contracts.js';
import { DESIGN_MD_FILE } from './packs.js';
import { readDesignSystemFiles } from './sync.js';

const DESIGN_MD_PROMPT_CAP = 100_000;

export interface DesignSystemPromptContext {
  designMd: string | null;
  entries: CompiledTokenEntry[];
  googleFontsUrl: string | null;
  errors: string[];
}

export async function readDesignSystemState(project: Project, direction: Direction): Promise<DesignSystemState> {
  const files = await readDesignSystemFiles(direction.workTree);
  return {
    packId: project.packId ?? null,
    manifest: files?.manifest ?? null,
    tokens: files?.tokens ?? null,
    entries: files?.entries ?? [],
    css: files?.css ?? null,
    errors: files?.errors ?? [],
  };
}

async function readDesignMd(workTree: string): Promise<string | null> {
  try {
    return await readFile(path.join(workTree, DESIGN_MD_FILE), 'utf8');
  } catch {
    return null;
  }
}

function capDesignMd(content: string): string {
  if (content.length <= DESIGN_MD_PROMPT_CAP) return content;
  return `${content.slice(0, DESIGN_MD_PROMPT_CAP)}\n[DESIGN.md cut at ${DESIGN_MD_PROMPT_CAP} characters]`;
}

export async function loadDesignSystemPromptContext(workTree: string): Promise<DesignSystemPromptContext | null> {
  const files = await readDesignSystemFiles(workTree);
  if (!files) return null;
  const designMd = await readDesignMd(workTree);
  const fontsUrl = files.manifest?.fonts?.googleFontsUrl;
  return {
    designMd: designMd === null ? null : capDesignMd(designMd),
    entries: files.entries,
    googleFontsUrl: typeof fontsUrl === 'string' ? fontsUrl : null,
    errors: files.errors,
  };
}
