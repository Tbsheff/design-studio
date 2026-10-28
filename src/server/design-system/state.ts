import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { AppTokenSource, CompiledTokenEntry, DesignSystemState, Direction, Project } from '../../shared/contracts.js';
import { appTokenState, loadAppTokens, usesAppTokens } from './app-tokens/source.js';
import { stripTokenBlock } from './design-md.js';
import { DESIGN_MD_FILE } from './packs.js';
import { readDesignSystemFiles } from './sync.js';

const DESIGN_MD_PROMPT_CAP = 100_000;

export interface DesignSystemPromptContext {
  designMd: string | null;
  entries: CompiledTokenEntry[];
  googleFontsUrl: string | null;
  errors: string[];
  source?: AppTokenSource;
}

export async function readDesignSystemState(project: Project, direction: Direction): Promise<DesignSystemState> {
  const files = await readDesignSystemFiles(direction.workTree);
  if (!files && usesAppTokens(project)) {
    const app = await loadAppTokens(direction.workTree);
    if (app) return appTokenState(app);
  }
  return {
    packId: files ? (files.manifest?.id ?? project.packId ?? null) : null,
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

export async function loadDesignSystemPromptContext(workTree: string, project?: Project): Promise<DesignSystemPromptContext | null> {
  const files = await readDesignSystemFiles(workTree);
  if (!files && project && usesAppTokens(project)) {
    const app = await loadAppTokens(workTree);
    return app ? { designMd: null, entries: app.entries, googleFontsUrl: null, errors: [], source: app.summary } : null;
  }
  if (!files) return null;
  const designMd = await readDesignMd(workTree);
  const fontsUrl = files.manifest?.fonts?.googleFontsUrl;
  return {
    designMd: designMd === null ? null : capDesignMd(stripTokenBlock(designMd)),
    entries: files.entries,
    googleFontsUrl: typeof fontsUrl === 'string' ? fontsUrl : null,
    errors: files.errors,
  };
}
