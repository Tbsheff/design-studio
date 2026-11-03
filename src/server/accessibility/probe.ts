import { appSourceBody, SOURCE_LOC_ATTR } from "./deps.js";

interface ProbeInput {
  readonly max: number;
  readonly root: string | null;
}

interface RawNode {
  readonly loc: string | null;
  readonly name: string;
  readonly nameFrom: string;
  readonly role: string;
  readonly selector: string;
  readonly tag: string;
}

interface RawTab extends RawNode {
  readonly tabIndex: number;
}

interface RawImage {
  readonly loc: string | null;
  readonly selector: string;
  readonly src: string;
  readonly tag: string;
}

interface RawText {
  readonly background: string | null;
  readonly foreground: string;
  readonly large: boolean;
  readonly loc: string | null;
  readonly selector: string;
  readonly tag: string;
  readonly text: string;
}

interface RawProbe {
  readonly images: readonly RawImage[];
  readonly missingRoot: boolean;
  readonly root: RawNode | null;
  readonly tabs: readonly RawTab[];
  readonly texts: readonly RawText[];
  readonly truncated: boolean;
  readonly unnamed: readonly RawNode[];
}

const PROBE_SOURCE = String.raw`async (input) => {
  const LOC = ${JSON.stringify(SOURCE_LOC_ATTR)};
  const appLoc = ${appSourceBody()};
  const ROLES = { a: 'link', button: 'button', select: 'combobox', textarea: 'textbox', img: 'img', nav: 'navigation', main: 'main', header: 'banner', footer: 'contentinfo', aside: 'complementary', form: 'form', ul: 'list', ol: 'list', li: 'listitem', dialog: 'dialog', h1: 'heading', h2: 'heading', h3: 'heading', h4: 'heading', h5: 'heading', h6: 'heading', table: 'table', section: 'region', summary: 'button' };
  const INPUT_ROLES = { checkbox: 'checkbox', radio: 'radio', range: 'slider', button: 'button', submit: 'button', reset: 'button', search: 'searchbox' };
  const FOCUSABLE = 'a[href], button, input, select, textarea, summary, iframe, [tabindex], [contenteditable=""], [contenteditable="true"]';
  const rootEl = input.root ? (() => { try { return document.querySelector(input.root); } catch { return null; } })() : document.body;
  if (!rootEl) return { missingRoot: true, truncated: false, root: null, tabs: [], unnamed: [], images: [], texts: [] };
  let truncated = false;
  const visible = (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
  const pathOf = (el) => {
    const parts = [];
    for (let node = el; node && node.nodeType === 1 && node !== document.documentElement; node = node.parentElement) {
      if (node.id && /^[A-Za-z][\w-]*$/.test(node.id)) { parts.unshift('#' + node.id); break; }
      const tag = node.tagName.toLowerCase();
      const same = node.parentElement ? [...node.parentElement.children].filter((c) => c.tagName === node.tagName) : [];
      parts.unshift(same.length > 1 ? tag + ':nth-of-type(' + (same.indexOf(node) + 1) + ')' : tag);
    }
    return parts.join(' > ');
  };
  const roleOf = (el) => {
    const own = el.getAttribute('role');
    if (own) return own.trim().split(/\s+/)[0];
    const tag = el.tagName.toLowerCase();
    if (tag === 'a' && !el.hasAttribute('href')) return 'generic';
    if (tag === 'input') return INPUT_ROLES[(el.getAttribute('type') || 'text').toLowerCase()] || 'textbox';
    return ROLES[tag] || 'generic';
  };
  const clean = (text) => (text || '').replace(/\s+/g, ' ').trim().slice(0, 200);
  const labelText = (el) => {
    if (el.labels && el.labels.length > 0) return clean([...el.labels].map((l) => l.textContent).join(' '));
    return '';
  };
  const nameOf = (el) => {
    const ids = el.getAttribute('aria-labelledby');
    if (ids) { const text = clean(ids.split(/\s+/).map((id) => document.getElementById(id)?.textContent || '').join(' ')); if (text) return { name: text, nameFrom: 'aria-labelledby' }; }
    const aria = clean(el.getAttribute('aria-label'));
    if (aria) return { name: aria, nameFrom: 'aria-label' };
    if (el.tagName === 'IMG' || (el.tagName === 'INPUT' && el.type === 'image')) { const alt = clean(el.getAttribute('alt')); if (alt) return { name: alt, nameFrom: 'alt' }; }
    const label = labelText(el);
    if (label) return { name: label, nameFrom: 'label' };
    const isField = ['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName);
    if (!isField) { const text = clean(el.innerText || el.textContent); if (text) return { name: text, nameFrom: 'text' }; const alts = clean([...el.querySelectorAll('img[alt], [aria-label]')].map((c) => c.getAttribute('alt') || c.getAttribute('aria-label')).join(' ')); if (alts) return { name: alts, nameFrom: 'text' }; }
    const title = clean(el.getAttribute('title'));
    if (title) return { name: title, nameFrom: 'title' };
    const holder = clean(el.getAttribute('placeholder'));
    if (holder) return { name: holder, nameFrom: 'placeholder' };
    if (el.tagName === 'INPUT' && ['submit', 'reset', 'button'].includes(el.type) && el.value) return { name: clean(el.value), nameFrom: 'text' };
    return { name: '', nameFrom: 'none' };
  };
  const locOf = async (el) => {
    const tagged = el.getAttribute(LOC);
    if (tagged) return tagged;
    const app = await appLoc(el).catch(() => null);
    return app?.loc || null;
  };
  const nodeOf = async (el) => ({ tag: el.tagName.toLowerCase(), role: roleOf(el), ...nameOf(el), selector: pathOf(el), loc: await locOf(el) });
  const cap = (list) => { if (list.length > input.max) { truncated = true; return list.slice(0, input.max); } return list; };
  const all = [rootEl, ...rootEl.querySelectorAll('*')];
  const focusable = all.filter((el) => el.matches(FOCUSABLE) && !el.disabled && el.tabIndex >= 0 && visible(el) && !el.closest('[inert]'));
  const ordered = [...focusable.filter((el) => el.tabIndex > 0).sort((a, b) => a.tabIndex - b.tabIndex), ...focusable.filter((el) => el.tabIndex === 0)];
  const tabs = [];
  for (const el of cap(ordered)) tabs.push({ ...(await nodeOf(el)), tabIndex: el.tabIndex });
  const unnamed = tabs.filter((tab) => tab.nameFrom === 'none').map(({ tabIndex, ...rest }) => rest);
  const images = [];
  for (const el of cap(all.filter((el) => el.tagName === 'IMG' && !el.hasAttribute('alt') && el.getAttribute('role') !== 'presentation' && el.getAttribute('aria-hidden') !== 'true'))) images.push({ tag: 'img', selector: pathOf(el), src: (el.getAttribute('src') || '').slice(0, 300), loc: await locOf(el) });
  for (const el of all.filter((el) => el.getAttribute('role') === 'img' && !nameOf(el).name).slice(0, input.max)) images.push({ tag: el.tagName.toLowerCase(), selector: pathOf(el), src: '', loc: await locOf(el) });
  const opaque = (value) => { const m = /rgba?\(([^)]+)\)/.exec(value); if (!m) return value !== 'transparent' && !/\/\s*0(\.0+)?\s*\)$/.test(value); const parts = m[1].split(/[\s,\/]+/).filter(Boolean); return parts.length < 4 || Number(parts[3]) >= 0.999; };
  const backgroundOf = (el) => {
    for (let node = el; node; node = node.parentElement) {
      const cs = getComputedStyle(node);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') return null;
      if (opaque(cs.backgroundColor)) return cs.backgroundColor;
    }
    return 'rgb(255, 255, 255)';
  };
  const ownText = (el) => clean([...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' '));
  const texts = [];
  for (const el of cap(all.filter((el) => ownText(el) && visible(el)))) {
    const cs = getComputedStyle(el);
    const size = parseFloat(cs.fontSize) || 16;
    const weight = Number(cs.fontWeight) || 400;
    texts.push({ tag: el.tagName.toLowerCase(), selector: pathOf(el), text: ownText(el).slice(0, 80), foreground: cs.color, background: backgroundOf(el), large: size >= 24 || (size >= 18.66 && weight >= 700), loc: await locOf(el) });
  }
  return { missingRoot: false, truncated, root: input.root ? await nodeOf(rootEl) : null, tabs, unnamed, images, texts };
}`;

const accessibilityProbe = (input: ProbeInput): string =>
  `(${PROBE_SOURCE})(${JSON.stringify(input)})`;

export { accessibilityProbe };

export type { ProbeInput, RawImage, RawNode, RawProbe, RawTab, RawText };
