import { toAppSourceBody, SOURCE_LOC_ATTR } from "./deps.js";

interface RawReaderNode {
  readonly checked: boolean | null;
  readonly depth: number;
  readonly disabled: boolean;
  readonly expanded: boolean | null;
  readonly level: number | null;
  readonly loc: string | null;
  readonly name: string;
  readonly role: string;
  readonly selector: string;
}

interface RawReaderProbe {
  readonly nodes: readonly RawReaderNode[];
  readonly truncated: boolean;
}

const READER_PROBE_SOURCE = String.raw`async (input) => {
  const LOC = ${JSON.stringify(SOURCE_LOC_ATTR)};
  const appLoc = ${toAppSourceBody()};
  const ROLES = { a: 'link', button: 'button', select: 'combobox', textarea: 'textbox', img: 'img', nav: 'navigation', main: 'main', header: 'banner', footer: 'contentinfo', aside: 'complementary', form: 'form', ul: 'list', ol: 'list', li: 'listitem', dialog: 'dialog', h1: 'heading', h2: 'heading', h3: 'heading', h4: 'heading', h5: 'heading', h6: 'heading', table: 'table', tr: 'row', th: 'columnheader', td: 'cell', section: 'region', summary: 'button', p: 'paragraph', article: 'article', fieldset: 'group', hr: 'separator', progress: 'progressbar', option: 'option', figure: 'figure', blockquote: 'blockquote' };
  const INPUT_ROLES = { checkbox: 'checkbox', radio: 'radio', range: 'slider', button: 'button', submit: 'button', reset: 'button', search: 'searchbox', number: 'spinbutton', image: 'button' };
  const LEAF = new Set(['button', 'link', 'heading', 'checkbox', 'radio', 'switch', 'tab', 'menuitem', 'option', 'img', 'textbox', 'searchbox', 'combobox', 'slider', 'spinbutton', 'progressbar', 'separator']);
  const SKIP = new Set(['SCRIPT', 'STYLE', 'TEMPLATE', 'NOSCRIPT', 'HEAD', 'META', 'LINK']);
  const nodes = [];
  let truncated = false;
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
  const clean = (text) => (text || '').replace(/\s+/g, ' ').trim().slice(0, 200);
  const roleOf = (el) => {
    const own = el.getAttribute('role');
    if (own) return own.trim().split(/\s+/)[0];
    const tag = el.tagName.toLowerCase();
    if (tag === 'svg') return 'none';
    if (tag === 'a' && !el.hasAttribute('href')) return 'generic';
    if (tag === 'img' && el.getAttribute('alt') === '') return 'presentation';
    if (tag === 'section' && !el.hasAttribute('aria-label') && !el.hasAttribute('aria-labelledby')) return 'generic';
    if (tag === 'input') { const type = (el.getAttribute('type') || 'text').toLowerCase(); if (type === 'hidden') return 'none'; return INPUT_ROLES[type] || 'textbox'; }
    return ROLES[tag] || 'generic';
  };
  const isFlat = (role) => role === 'generic' || role === 'none' || role === 'presentation';
  const isHidden = (el) => {
    if (el.hidden || el.getAttribute('aria-hidden') === 'true' || el.hasAttribute('inert')) return true;
    const cs = getComputedStyle(el);
    return cs.display === 'none' || cs.visibility === 'hidden';
  };
  const authorName = (el) => {
    const ids = el.getAttribute('aria-labelledby');
    if (ids) { const text = clean(ids.split(/\s+/).map((id) => document.getElementById(id)?.textContent || '').join(' ')); if (text) return text; }
    return clean(el.getAttribute('aria-label'));
  };
  const textOf = (el) => {
    const parts = [];
    const visit = (node) => {
      if (node.nodeType === 3) { parts.push(node.textContent); return; }
      if (node.nodeType !== 1 || SKIP.has(node.tagName) || isHidden(node)) return;
      if (node.tagName === 'IMG') { parts.push(node.getAttribute('alt') || ''); return; }
      const label = authorName(node);
      if (label && node !== el) { parts.push(label); return; }
      for (const child of node.childNodes) visit(child);
    };
    visit(el);
    return clean(parts.join(' '));
  };
  const nameOf = (el) => {
    const author = authorName(el);
    if (author) return author;
    if (el.tagName === 'IMG' || (el.tagName === 'INPUT' && el.type === 'image')) { const alt = clean(el.getAttribute('alt')); if (alt) return alt; }
    if (el.labels && el.labels.length > 0) { const label = clean([...el.labels].map((l) => l.textContent).join(' ')); if (label) return label; }
    const isField = ['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName);
    if (!isField && el.tagName !== 'IMG') { const text = textOf(el); if (text) return text; }
    if (el.tagName === 'INPUT' && ['submit', 'reset', 'button'].includes(el.type) && el.value) return clean(el.value);
    const title = clean(el.getAttribute('title'));
    if (title) return title;
    return clean(el.getAttribute('placeholder'));
  };
  const boolOf = (value) => { if (value === 'true') return true; if (value === 'false') return false; return null; };
  const checkedOf = (el, role) => {
    const aria = boolOf(el.getAttribute('aria-checked'));
    if (aria !== null) return aria;
    if (el.tagName === 'INPUT' && (role === 'checkbox' || role === 'radio')) return el.checked;
    return null;
  };
  const levelOf = (el, role) => {
    const aria = Number(el.getAttribute('aria-level'));
    if (aria > 0) return aria;
    const match = /^H([1-6])$/.exec(el.tagName);
    if (role === 'heading' && match) return Number(match[1]);
    return null;
  };
  const locOf = async (el) => {
    const tagged = el.getAttribute(LOC);
    if (tagged) return tagged;
    const app = await appLoc(el).catch(() => null);
    return app?.loc || null;
  };
  const push = async (el, role, name, depth) => {
    if (nodes.length >= input.max) { truncated = true; return; }
    nodes.push({ role, name, depth, selector: pathOf(el), loc: await locOf(el), checked: checkedOf(el, role), expanded: boolOf(el.getAttribute('aria-expanded')), disabled: el.disabled === true || el.getAttribute('aria-disabled') === 'true', level: levelOf(el, role) });
  };
  const hasRoleInside = (el) => [...el.querySelectorAll('*')].some((child) => !SKIP.has(child.tagName) && !isFlat(roleOf(child)));
  const walk = async (el, depth) => {
    for (const child of el.childNodes) {
      if (truncated) return;
      if (child.nodeType === 3) { const text = clean(child.textContent); if (text) await push(el, 'text', text, depth); continue; }
      if (child.nodeType !== 1 || SKIP.has(child.tagName) || isHidden(child)) continue;
      const role = roleOf(child);
      if (isFlat(role)) { if (!['SVG', 'svg', 'IMG', 'INPUT'].includes(child.tagName)) await walk(child, depth); continue; }
      if (LEAF.has(role)) { await push(child, role, nameOf(child), depth); continue; }
      const author = authorName(child);
      if (!author && !hasRoleInside(child)) { await push(child, role, textOf(child), depth); continue; }
      await push(child, role, author, depth);
      await walk(child, depth + 1);
    }
  };
  await walk(document.body, 0);
  return { nodes, truncated };
}`;

const toReaderProbe = (max: number): string =>
  `(${READER_PROBE_SOURCE})(${JSON.stringify({ max })})`;

export { toReaderProbe };

export type { RawReaderNode, RawReaderProbe };
