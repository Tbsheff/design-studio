import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { TOKENS_CSS_FILE } from '../../shared/contracts.js';
import { GOOGLE_FONTS_PREFIX } from './packs.js';
import { hasTokensFile, readManifest } from './sync.js';

const TOKENS_LINK = /<link\b[^>]*\bhref\s*=\s*["']?[^"'>\s]*design-system\/tokens\.css/i;

export function hasTokensLink(html: string): boolean {
  return TOKENS_LINK.test(html);
}

export function tokensHrefFor(htmlRelative: string): string {
  const dir = path.posix.dirname(htmlRelative.split(path.sep).join('/'));
  return path.posix.relative(dir === '.' ? '' : dir, TOKENS_CSS_FILE) || TOKENS_CSS_FILE;
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function headInsertOffset(html: string): number {
  const head = /<head\b[^>]*>/i.exec(html);
  if (head) return head.index + head[0].length;
  const root = /<html\b[^>]*>/i.exec(html);
  if (root) return root.index + root[0].length;
  const doctype = /<!doctype[^>]*>/i.exec(html);
  return doctype ? doctype.index + doctype[0].length : 0;
}

interface LinkInjection {
  tokensHref: string | null;
  fontsUrl: string | null;
}

function injectDesignSystemLinks(html: string, injection: LinkInjection): string {
  const tags: string[] = [];
  if (injection.fontsUrl && !html.includes('fonts.googleapis.com')) tags.push(`<link rel="stylesheet" href="${escapeAttr(injection.fontsUrl)}">`);
  if (injection.tokensHref && !hasTokensLink(html)) tags.push(`<link rel="stylesheet" href="${escapeAttr(injection.tokensHref)}">`);
  if (tags.length === 0) return html;
  const at = headInsertOffset(html);
  return html.slice(0, at) + tags.join('') + html.slice(at);
}

async function designSystemInjectionFor(root: string, htmlRelative: string): Promise<LinkInjection | null> {
  if (!(await hasTokensFile(root))) return null;
  const manifest = await readManifest(root);
  const fontsUrl = manifest?.fonts?.googleFontsUrl;
  return {
    tokensHref: tokensHrefFor(htmlRelative),
    fontsUrl: typeof fontsUrl === 'string' && fontsUrl.startsWith(GOOGLE_FONTS_PREFIX) ? fontsUrl : null,
  };
}

export async function injectForPreview(root: string, htmlRelative: string, html: string): Promise<string> {
  const injection = await designSystemInjectionFor(root, htmlRelative).catch(() => null);
  return injection ? injectDesignSystemLinks(html, injection) : html;
}

function missingLinkMessage(entry: string): string {
  return `${TOKENS_CSS_FILE} is not linked from ${entry}`;
}

export async function designSystemLinkProblem(workTree: string, entry: string): Promise<string | null> {
  if (!(await hasTokensFile(workTree))) return null;
  let html: string;
  try {
    html = await readFile(path.join(workTree, entry), 'utf8');
  } catch {
    return null;
  }
  return hasTokensLink(html) ? null : missingLinkMessage(entry);
}
