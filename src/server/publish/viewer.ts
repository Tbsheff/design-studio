import { mkdir, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { DesignComment } from '../../shared/contracts.js';
import type { ShareFrame } from '../../shared/share.js';
import { frameFile } from '../share/snapshot.js';

export interface ViewerComment {
  frame: string | null;
  author: string;
  text: string;
  replies: { author: string; text: string }[];
}

export interface ViewerPage {
  title: string;
  versionLabel: string;
  publishedAt: number;
  frames: ShareFrame[];
  comments: ViewerComment[];
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
}

const STYLE = `:root{color-scheme:light dark;--bg:#faf9f5;--panel:#fff;--line:rgb(28 27 25 / .12);--text:rgb(28 27 25 / .94);--muted:rgb(28 27 25 / .66)}
@media (prefers-color-scheme:dark){:root{--bg:#1c1b19;--panel:#222220;--line:rgb(250 249 245 / .12);--text:rgb(250 249 245 / .92);--muted:rgb(250 249 245 / .6)}}
*{box-sizing:border-box}body{margin:0;font:13px/1.45 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;background:var(--bg);color:var(--text)}
header{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:12px;height:48px;padding:0 16px;background:var(--panel);border-bottom:1px solid var(--line)}
header h1{margin:0;font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.badge{padding:2px 8px;border:1px solid var(--line);border-radius:999px;color:var(--muted);font-size:12px;white-space:nowrap}
.spacer{flex:1}nav{display:flex;gap:4px;overflow:auto}nav a{color:var(--muted);text-decoration:none;padding:4px 8px;border-radius:6px;white-space:nowrap}nav a:hover{color:var(--text);background:var(--bg)}
main{display:grid;grid-template-columns:minmax(0,1fr);min-height:calc(100vh - 48px)}main.with-notes{grid-template-columns:minmax(0,1fr) 300px}
.frames{padding:24px;display:flex;flex-direction:column;align-items:center;gap:32px}
figure{margin:0;max-width:100%}figcaption{margin-bottom:8px;color:var(--muted);font-size:12px}
.shot{border:1px solid var(--line);border-radius:6px;overflow:hidden;background:var(--panel)}.shot img{display:block;max-width:100%;height:auto}
aside{border-left:1px solid var(--line);background:var(--panel);padding:16px;display:flex;flex-direction:column;gap:12px;position:sticky;top:48px;height:calc(100vh - 48px);overflow:auto}
aside h2{margin:0;font-size:13px;font-weight:600}ol{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
li{padding:8px 10px;border:1px solid var(--line);border-radius:8px}.who{font-weight:600}.where{color:var(--muted);font-size:12px}li p{margin:4px 0 0;white-space:pre-wrap;overflow-wrap:anywhere}
.reply{margin-top:6px;padding-left:8px;border-left:2px solid var(--line)}
@media (max-width:760px){main.with-notes{grid-template-columns:1fr}aside{position:static;height:auto;border-left:0;border-top:1px solid var(--line)}}
`;

function figure(frame: ShareFrame, index: number): string {
  const width = Math.min(frame.width, 1440);
  const height = Math.round((frame.cssHeight / frame.width) * width);
  const caption = `${escapeHtml(frame.name)}${frame.path ? ` · ${escapeHtml(frame.path)}` : ''} · ${frame.width} × ${frame.height}`;
  return `<figure id="f${index + 1}"><figcaption>${caption}</figcaption><div class="shot"><img src="frames/${index}.png" width="${width}" height="${height}" alt="${escapeHtml(frame.name)}" loading="${index < 2 ? 'eager' : 'lazy'}"></div></figure>`;
}

function comment(c: ViewerComment): string {
  const replies = c.replies.map((r) => `<div class="reply"><span class="who">${escapeHtml(r.author)}</span><p>${escapeHtml(r.text)}</p></div>`).join('');
  return `<li><span class="who">${escapeHtml(c.author)}</span>${c.frame ? ` <span class="where">on ${escapeHtml(c.frame)}</span>` : ''}<p>${escapeHtml(c.text)}</p>${replies}</li>`;
}

export function viewerHtml(page: ViewerPage): string {
  const nav = page.frames.length > 1 ? `<nav aria-label="Frames">${page.frames.map((f, i) => `<a href="#f${i + 1}">${escapeHtml(f.name)}</a>`).join('')}</nav>` : '';
  const notes = page.comments.length > 0 ? `<aside aria-label="Comments"><h2>Comments (${page.comments.length})</h2><ol>${page.comments.map(comment).join('')}</ol></aside>` : '';
  const when = new Date(page.publishedAt).toISOString().slice(0, 10);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><meta name="referrer" content="no-referrer"><link rel="icon" href="data:,"><title>${escapeHtml(page.title)}</title><link rel="stylesheet" href="viewer.css"></head><body><header><h1>${escapeHtml(page.title)}</h1><span class="badge">${escapeHtml(page.versionLabel)} · ${when}</span><span class="spacer"></span>${nav}</header><main class="${notes ? 'with-notes' : ''}"><section class="frames">${page.frames.map(figure).join('')}</section>${notes}</main></body></html>`;
}

export function viewerComments(list: DesignComment[], frames: ShareFrame[]): ViewerComment[] {
  const names = new Map(frames.filter((f) => f.id).map((f) => [f.id as string, f.name]));
  return list
    .filter((c) => c.status !== 'resolved' && c.status !== 'orphaned')
    .slice(0, 200)
    .map((c) => ({
      frame: (c.frame?.id ? names.get(c.frame.id) : undefined) ?? c.frame?.label ?? null,
      author: (c.author || 'Designer').slice(0, 60),
      text: c.text.slice(0, 2000),
      replies: (c.replies ?? []).slice(0, 20).map((r) => ({ author: ((r as { author?: string }).author || 'Designer').slice(0, 60), text: r.text.slice(0, 2000) })),
    }));
}

export async function writeViewer(outDir: string, shotsDir: string, page: ViewerPage): Promise<{ files: string[]; bytes: number }> {
  const framesDir = path.join(outDir, 'frames');
  await mkdir(framesDir, { recursive: true });
  const files: string[] = ['index.html', 'viewer.css'];
  let bytes = 0;
  for (let i = 0; i < page.frames.length; i += 1) {
    const target = path.join(framesDir, `${i}.png`);
    await rename(frameFile(shotsDir, i), target);
    bytes += (await stat(target)).size;
    files.push(`frames/${i}.png`);
  }
  const html = viewerHtml(page);
  await writeFile(path.join(outDir, 'index.html'), html);
  await writeFile(path.join(outDir, 'viewer.css'), STYLE);
  return { files, bytes: bytes + Buffer.byteLength(html) + Buffer.byteLength(STYLE) };
}
