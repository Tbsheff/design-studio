import type { ProjectKind } from '../../shared/contracts.js';
import { BRIDGE_SCRIPT_PATH, BRIDGE_TOKEN_PARAM, SOURCE_LOC_ATTR } from '../../shared/contracts.js';
import type { PreviewService } from '../types.js';
import { waitForPage } from './capture.js';
import type { ExportFrame } from '../../shared/export.js';
import { withPagePath } from './source.js';

export interface InlinedHtml {
  html: string;
  missing: string[];
}

const MAX_ASSET_BYTES = 15 * 1024 * 1024;

function inlineExpression(kind: ProjectKind): string {
  return `(async () => {
  const kind = ${JSON.stringify(kind)};
  const LOC = ${JSON.stringify(SOURCE_LOC_ATTR)};
  const BRIDGE = ${JSON.stringify(BRIDGE_SCRIPT_PATH)};
  const TOKEN_PARAM = ${JSON.stringify(BRIDGE_TOKEN_PARAM)};
  const MAX = ${MAX_ASSET_BYTES};
  const missing = [];
  const cache = new Map();
  const clean = (href) => { try { const u = new URL(href, location.href); u.searchParams.delete(TOKEN_PARAM); for (const key of [...u.searchParams.keys()]) if (key.startsWith('__studio')) u.searchParams.delete(key); return u.href; } catch (error) { return href; } };
  const absolute = (raw, base) => { try { return new URL(raw, base).href; } catch (error) { return null; } };
  const readBlob = (blob) => new Promise((done, fail) => { const reader = new FileReader(); reader.onload = () => done(String(reader.result)); reader.onerror = fail; reader.readAsDataURL(blob); });
  const dataUrl = (url) => {
    if (!/^https?:/i.test(url)) return Promise.resolve(url);
    if (cache.has(url)) return cache.get(url);
    const job = (async () => {
      try {
        const res = await fetch(url, { credentials: 'omit' });
        if (!res.ok) throw new Error(String(res.status));
        const blob = await res.blob();
        if (blob.size > MAX) throw new Error('too large');
        return await readBlob(blob);
      } catch (error) { missing.push(clean(url)); return clean(url); }
    })();
    cache.set(url, job);
    return job;
  };
  const text = async (url) => {
    try { const res = await fetch(url, { credentials: 'omit' }); if (!res.ok) throw new Error(String(res.status)); return await res.text(); }
    catch (error) { missing.push(clean(url)); return null; }
  };
  const inlineCss = async (css, base, depth) => {
    const imports = [...css.matchAll(/@import\\s+(?:url\\(\\s*)?['"]?([^'")\\s;]+)['"]?\\s*\\)?([^;]*);/g)];
    for (const match of imports) {
      const url = absolute(match[1], base);
      const body = url && depth < 4 ? await text(url) : null;
      if (body === null) continue;
      const inner = await inlineCss(body, url, depth + 1);
      const media = match[2].trim();
      css = css.split(match[0]).join(media ? '@media ' + media + '{' + inner + '}' : inner);
    }
    const urls = [...new Set([...css.matchAll(/url\\(\\s*(['"]?)([^'")]+)\\1\\s*\\)/g)].map((m) => m[0]))];
    for (const whole of urls) {
      const raw = whole.replace(/^url\\(\\s*['"]?/, '').replace(/['"]?\\s*\\)$/, '').trim();
      if (/^(data:|#|about:)/i.test(raw)) continue;
      const url = absolute(raw, base);
      if (!url) continue;
      css = css.split(whole).join('url("' + (await dataUrl(url)) + '")');
    }
    return css;
  };
  const srcset = async (value, base) => {
    const parts = value.split(',').map((part) => part.trim()).filter(Boolean);
    const out = [];
    for (const part of parts) {
      const [raw, ...rest] = part.split(/\\s+/);
      const url = absolute(raw, base);
      out.push([url ? await dataUrl(url) : raw, ...rest].join(' '));
    }
    return out.join(', ');
  };

  let doc;
  if (kind === 'html') {
    const res = await fetch(location.href, { credentials: 'omit' });
    doc = new DOMParser().parseFromString(await res.text(), 'text/html');
  } else {
    doc = document.cloneNode(true);
    for (const script of [...doc.querySelectorAll('script')]) script.remove();
  }
  const base = location.href;
  for (const node of [...doc.querySelectorAll('script[src*="/__studio/"], script[src="' + BRIDGE + '"], script[src*="/@vite/"], script[src*="/@react-refresh"], link[rel="modulepreload"], link[rel="preconnect"], link[rel="dns-prefetch"], style[id^="studio-"]')]) node.remove();
  for (const node of [...doc.querySelectorAll('[' + LOC + '], [data-studio-text-edit]')]) { node.removeAttribute(LOC); node.removeAttribute('data-studio-text-edit'); node.removeAttribute('contenteditable'); }
  for (const link of [...doc.querySelectorAll('link[rel~="stylesheet"][href]')]) {
    const url = absolute(link.getAttribute('href'), base);
    const body = url ? await text(url) : null;
    if (body === null) continue;
    const style = doc.createElement('style');
    const media = link.getAttribute('media');
    if (media && media !== 'all') style.setAttribute('media', media);
    style.textContent = await inlineCss(body, url, 0);
    link.replaceWith(style);
  }
  for (const style of [...doc.querySelectorAll('style')]) style.textContent = await inlineCss(style.textContent || '', base, 0);
  for (const node of [...doc.querySelectorAll('[style]')]) { const value = node.getAttribute('style'); if (value && value.includes('url(')) node.setAttribute('style', await inlineCss(value, base, 9)); }
  for (const link of [...doc.querySelectorAll('link[rel~="icon"][href], link[rel="apple-touch-icon"][href]')]) { const url = absolute(link.getAttribute('href'), base); if (url) link.setAttribute('href', await dataUrl(url)); }
  for (const script of [...doc.querySelectorAll('script[src]')]) {
    const url = absolute(script.getAttribute('src'), base);
    const body = url ? await text(url) : null;
    if (body === null) continue;
    script.removeAttribute('src');
    script.textContent = body.replace(/<\\/script/gi, '<\\\\/script');
  }
  for (const node of [...doc.querySelectorAll('img[src], source[src], video[src], audio[src], input[type="image"][src], embed[src], track[src]')]) { const url = absolute(node.getAttribute('src'), base); if (url) node.setAttribute('src', await dataUrl(url)); }
  for (const node of [...doc.querySelectorAll('img[srcset], source[srcset]')]) node.setAttribute('srcset', await srcset(node.getAttribute('srcset'), base));
  for (const node of [...doc.querySelectorAll('video[poster]')]) { const url = absolute(node.getAttribute('poster'), base); if (url) node.setAttribute('poster', await dataUrl(url)); }
  for (const node of [...doc.querySelectorAll('image[href], use[href]')]) { const raw = node.getAttribute('href'); if (raw && !raw.startsWith('#')) { const url = absolute(raw, base); if (url) node.setAttribute('href', await dataUrl(url)); } }
  for (const anchor of [...doc.querySelectorAll('a[href]')]) { const raw = anchor.getAttribute('href'); if (raw && raw.includes(TOKEN_PARAM)) anchor.setAttribute('href', clean(raw)); }
  if (!doc.querySelector('meta[charset]')) { const meta = doc.createElement('meta'); meta.setAttribute('charset', 'utf-8'); doc.head.prepend(meta); }
  return { html: '<!doctype html>\\n' + doc.documentElement.outerHTML, missing: [...new Set(missing)] };
})()`;
}

export async function inlineHtml(preview: PreviewService, url: string, frame: ExportFrame, kind: ProjectKind, secrets: string[]): Promise<InlinedHtml> {
  if (!preview.withPage) throw new Error('this preview backend cannot export HTML');
  const result = await preview.withPage(withPagePath(url, frame.path), { width: frame.width, height: frame.height }, async (page) => {
    await waitForPage(page);
    return page.evaluate<InlinedHtml>(inlineExpression(kind));
  });
  for (const secret of secrets) {
    if (secret && result.html.includes(secret)) throw new Error('export stopped: the page holds a studio secret');
  }
  return result;
}
