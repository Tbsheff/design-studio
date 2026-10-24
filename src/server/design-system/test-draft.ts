import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PACK_FILE, TOKENS_FILE } from '../../shared/contracts.js';
import { DESIGN_MD_SECTIONS, TODO_MARK } from './extract/compose.js';
import { KIT_PAGE_FILE, renderKitPage } from './extract/kit-page.js';
import { DESIGN_MD_FILE, packRegistry } from './packs.js';

export function draftDesignMd(name: string, todos: number): string {
  const lines = [`# ${name}`, ''];
  DESIGN_MD_SECTIONS.forEach((section, index) => {
    lines.push(`## ${section}`, '', `Concrete rules for ${section.toLowerCase()}.`);
    if (index < todos) lines.push(`${TODO_MARK} fill in ${section.toLowerCase()}._`);
    lines.push('');
  });
  return lines.join('\n');
}

export async function writeTestDraft(workTree: string, options: { todos: number; packId?: string }): Promise<void> {
  const pack = await packRegistry().get(options.packId ?? 'modern-minimal');
  if (!pack) throw new Error('missing base pack');
  await mkdir(path.join(workTree, 'design-system'), { recursive: true });
  await writeFile(path.join(workTree, TOKENS_FILE), pack.tokensText);
  await writeFile(path.join(workTree, PACK_FILE), `${JSON.stringify(pack.manifest, null, 2)}\n`);
  await writeFile(path.join(workTree, DESIGN_MD_FILE), draftDesignMd(pack.manifest.name, options.todos));
  await writeFile(path.join(workTree, KIT_PAGE_FILE), renderKitPage({ name: pack.manifest.name, mode: pack.manifest.mode, ...(pack.manifest.fonts.googleFontsUrl ? { googleFontsUrl: pack.manifest.fonts.googleFontsUrl } : {}) }));
}
