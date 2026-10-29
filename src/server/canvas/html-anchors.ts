import { parse } from 'parse5';
import type { DefaultTreeAdapterMap } from 'parse5';
import { cleanLinkSelector, cleanLinkText, LINK_TEXT_MAX } from '../../shared/links.js';
import { scriptTargets, type ScriptTargets } from './script-links.js';

type Node = DefaultTreeAdapterMap['node'];
type Element = DefaultTreeAdapterMap['element'];

export interface PageAnchor {
  href: string;
  selector: string;
  tag: string;
  text?: string;
  label?: string;
}

interface Found {
  href: string;
  selector: string;
  tag: string;
  text: string;
  textless: boolean;
}

const MAX_ANCHORS = 60;
const ID_RE = /^[A-Za-z_][\w-]*$/;
const SKIP_TEXT = new Set(['script', 'style', 'template', 'noscript']);
const SUBMIT_INPUTS = new Set(['submit', 'image']);
const INLINE = new Set(['a', 'span', 'b', 'strong', 'em', 'i', 'small', 'u', 's', 'code', 'abbr', 'mark', 'sup', 'sub', 'label', 'time', 'kbd', 'q', 'cite']);

function isElement(node: Node): node is Element {
  return 'tagName' in node;
}

function attr(el: Element, name: string): string | null {
  return el.attrs.find((item) => item.name === name)?.value ?? null;
}

function childrenOf(node: Node): Node[] {
  const content = (node as { content?: Node }).content;
  const own = 'childNodes' in node ? node.childNodes : [];
  return content && 'childNodes' in content ? [...own, ...content.childNodes] : own;
}

function textOf(node: Node): string {
  if (node.nodeName === '#text' && 'value' in node) return node.value;
  if (isElement(node) && SKIP_TEXT.has(node.tagName)) return ' ';
  const parts = childrenOf(node).map(textOf);
  return isElement(node) && !INLINE.has(node.tagName) ? ` ${parts.join('')} ` : parts.join('');
}

function shortText(el: Element): string {
  const raw = el.tagName === 'input' ? (attr(el, 'value') ?? '') : textOf(el);
  return raw.replace(/\s+/g, ' ').trim().slice(0, LINK_TEXT_MAX);
}

export interface PageTree {
  elements: Element[];
  scripts: string[];
  byId: Map<string, Element>;
  formOf: Map<Element, Element>;
}

export function pageTree(html: string): PageTree {
  const tree: PageTree = { elements: [], scripts: [], byId: new Map(), formOf: new Map() };
  const walk = (node: Node, form: Element | null): void => {
    let inside = form;
    if (isElement(node)) {
      tree.elements.push(node);
      const id = attr(node, 'id');
      if (id && !tree.byId.has(id)) tree.byId.set(id, node);
      if (form) tree.formOf.set(node, form);
      if (node.tagName === 'form') inside = node;
      if (node.tagName === 'script' && !attr(node, 'src')) tree.scripts.push(node.childNodes.map((child) => ('value' in child ? child.value : '')).join(''));
    }
    for (const child of childrenOf(node)) walk(child, inside);
  };
  walk(parse(html), null);
  return tree;
}

export function scriptSources(tree: PageTree): string[] {
  return tree.elements.flatMap((el) => {
    const src = el.tagName === 'script' ? attr(el, 'src') : null;
    return src && !/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(src) ? [src] : [];
  });
}

function cssString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function idOf(el: Element): string | null {
  const id = attr(el, 'id');
  return id && ID_RE.test(id) ? id : null;
}

function isSubmit(el: Element): boolean {
  if (el.tagName === 'button') return (attr(el, 'type') ?? 'submit').toLowerCase() === 'submit';
  return el.tagName === 'input' && SUBMIT_INPUTS.has((attr(el, 'type') ?? '').toLowerCase());
}

function formScope(form: Element): string {
  const id = idOf(form);
  if (id) return `#${id}`;
  const action = attr(form, 'action');
  return action ? `form[action="${cssString(action)}"]` : 'form';
}

function submitSelector(el: Element, form: Element): string {
  const type = attr(el, 'type');
  const own = type ? `${el.tagName}[type="${cssString(type)}"]` : `${el.tagName}:not([type])`;
  return `${formScope(form)} ${own}`;
}

function formTarget(form: Element, scripts: ScriptTargets): string | null {
  const id = idOf(form);
  const handled = (id ? scripts.submit.get(`#${id}`) : null) ?? scripts.onAttr(attr(form, 'onsubmit'));
  if (handled) return handled;
  const action = attr(form, 'action');
  const method = (attr(form, 'method') ?? '').toLowerCase();
  return action && method !== 'dialog' ? action : null;
}

function selectorFor(el: Element, kind: 'href' | 'onclick'): string {
  const id = idOf(el);
  if (id) return `#${id}`;
  if (kind === 'href') return `a[href="${cssString(attr(el, 'href') ?? '')}"]`;
  const onclick = attr(el, 'onclick') ?? '';
  return `${el.tagName}[onclick*="${cssString(onclick.slice(0, 80))}"]`;
}

function scriptHref(el: Element, scripts: ScriptTargets): { href: string; selector: string } | null {
  const id = idOf(el);
  const href = id ? (scripts.href.get(`#${id}`) ?? scripts.click.get(`#${id}`)) : undefined;
  return href ? { href, selector: `#${id}` } : null;
}

function plainHref(el: Element): string | null {
  const href = el.tagName === 'a' ? attr(el, 'href') : null;
  return href && href.trim() !== '' && !href.trim().startsWith('#') && !/^\s*javascript:/i.test(href) ? href : null;
}

function elementAnchor(el: Element, tree: PageTree, scripts: ScriptTargets): Found | null {
  const base = { tag: el.tagName, text: shortText(el), textless: el.tagName === 'input' };
  const fromScript = scriptHref(el, scripts);
  if (fromScript) return { ...base, ...fromScript };
  const href = plainHref(el);
  if (href) return { ...base, href, selector: selectorFor(el, 'href') };
  const click = scripts.onAttr(attr(el, 'onclick'));
  if (click) return { ...base, href: click, selector: selectorFor(el, 'onclick') };
  const form = isSubmit(el) ? tree.formOf.get(el) : undefined;
  const target = form ? formTarget(form, scripts) : null;
  if (form && target) return { ...base, href: target, selector: idOf(el) ? `#${idOf(el)}` : submitSelector(el, form) };
  return null;
}

function matches(el: Element, selector: string): boolean {
  const simple = /^([a-z][a-z0-9-]*)?(?:\.([\w-]+))?$/i.exec(selector);
  if (!simple || (!simple[1] && !simple[2])) return false;
  if (simple[1] && el.tagName !== simple[1].toLowerCase()) return false;
  return !simple[2] || (attr(el, 'class') ?? '').split(/\s+/).includes(simple[2]);
}

function selectorAnchors(tree: PageTree, scripts: ScriptTargets): Found[] {
  const out: Found[] = [];
  for (const [selector, href] of [...scripts.href, ...scripts.click]) {
    if (selector.startsWith('#')) continue;
    const el = tree.elements.find((item) => matches(item, selector));
    if (el) out.push({ href, selector, tag: el.tagName, text: shortText(el), textless: el.tagName === 'input' });
  }
  return out;
}

export function treeAnchors(tree: PageTree, extraScripts: readonly string[] = []): PageAnchor[] {
  const scripts = scriptTargets([...tree.scripts, ...extraScripts], (id) => tree.byId.has(id));
  const found: Found[] = [];
  for (const el of tree.elements) {
    const anchor = elementAnchor(el, tree, scripts);
    if (anchor) found.push(anchor);
    if (found.length >= MAX_ANCHORS) break;
  }
  found.push(...selectorAnchors(tree, scripts));
  const counts = new Map<string, number>();
  for (const anchor of found) counts.set(anchor.selector, (counts.get(anchor.selector) ?? 0) + 1);
  return found.slice(0, MAX_ANCHORS).flatMap((anchor) => {
    const selector = cleanLinkSelector(anchor.selector);
    if (!selector) return [];
    const name = cleanLinkText(anchor.text);
    const text = !anchor.textless && (counts.get(anchor.selector) ?? 0) > 1 ? name : null;
    return [{ href: anchor.href, selector, tag: anchor.tag, ...(text ? { text } : name ? { label: name } : {}) }];
  });
}

export function htmlAnchors(html: string, extraScripts: readonly string[] = []): PageAnchor[] {
  return treeAnchors(pageTree(html), extraScripts);
}

export function clickCandidates(tree: PageTree, anchors: readonly PageAnchor[]): number {
  const linked = new Set(anchors.map((anchor) => anchor.selector));
  return tree.elements.filter((el) => {
    const id = idOf(el);
    if (id && linked.has(`#${id}`)) return false;
    if (el.tagName === 'a') return !plainHref(el);
    return el.tagName === 'button' || attr(el, 'onclick') !== null || attr(el, 'role') === 'button' || (el.tagName === 'input' && isSubmit(el));
  }).length;
}
