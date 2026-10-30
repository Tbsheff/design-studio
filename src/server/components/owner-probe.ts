import { APP_SOURCE_PATH } from '../../shared/app.js';
import type { SourceLoc } from '../../shared/contracts.js';
import { OWNERS_MAX, OWNER_STACK_MAX, type ComponentOwner } from '../../shared/props.js';
import type { PreviewService } from '../types.js';
import { probeOnPage } from '../preview/probe-page.js';

export interface ProbedElement {
  tag: string;
  owners: ComponentOwner[];
  usedAt: SourceLoc | null;
}

interface RawProbe {
  tag: string;
  owners: ComponentOwner[];
  usedAt: string | null;
}

export function appSourceBody(): string {
  return `async (el) => {
    const fiberOf = (node) => { const key = Object.keys(node).find((k) => k.startsWith('__reactFiber$')); return key ? node[key] : null; };
    const stackOf = (f) => [f?._debugStack?.stack, f?.debugStack?.stack, f?.stack].find((v) => typeof v === 'string' && v.length > 0) || '';
    const fiber = fiberOf(el);
    if (!fiber) return null;
    const owner = fiber._debugOwner || null;
    const type = owner?.type;
    const name = typeof owner?.name === 'string' ? owner.name : type?.displayName || type?.render?.displayName || type?.render?.name || type?.type?.displayName || type?.type?.name || type?.name || null;
    let parent = el.parentElement;
    while (parent && !fiberOf(parent)) parent = parent.parentElement;
    const nameOf = (info) => (typeof info?.name === 'string' ? info.name : info?.type?.displayName || info?.type?.render?.displayName || info?.type?.render?.name || info?.type?.type?.displayName || info?.type?.type?.name || info?.type?.name) || null;
    const sameOwner = (a, b) => { if (a === b) return true; if (!a || !b || typeof a.tag === 'number' || typeof b.tag === 'number') return false; const upper = (info) => (info.owner ? nameOf(info.owner) : null); return nameOf(a) === nameOf(b) && a.key === b.key && a.env === b.env && upper(a) === upper(b); };
    const root = !parent || !sameOwner(fiberOf(parent)._debugOwner || null, owner);
    const stacks = [stackOf(fiber), stackOf(owner)];
    if (stacks.every((stack) => stack === '')) return null;
    try {
      const res = await fetch(${JSON.stringify(APP_SOURCE_PATH)}, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ stacks }), cache: 'no-store' });
      const body = res.ok ? await res.json() : null;
      const [own, used] = Array.isArray(body?.sources) ? body.sources : [];
      const loc = own || used || null;
      const file = (value) => String(value).replace(/:\\d+:\\d+$/, '');
      const usedAt = own && used && file(own) !== file(used) ? used : null;
      return loc ? { loc, usedAt, usedBy: usedAt && name ? { name, root } : null } : null;
    } catch { return null; }
  }`;
}

export function ownerWalk(): string {
  return `((el) => {
    const tags = new Set([0, 1, 11, 14, 15]);
    const nameOf = (type) => {
      if (!type || (typeof type !== 'function' && typeof type !== 'object')) return '';
      if (typeof type.displayName === 'string' && type.displayName) return type.displayName;
      if (typeof type.name === 'string' && type.name) return type.name;
      if (type.render) return nameOf(type.render);
      if (type.type) return nameOf(type.type);
      return '';
    };
    let fiber = null;
    for (let node = el; node && !fiber; node = node.parentElement) {
      const key = Object.keys(node).find((k) => k.startsWith('__reactFiber$'));
      if (key) fiber = node[key];
    }
    const owners = [];
    for (let guard = 0; fiber && owners.length < ${OWNERS_MAX} && guard < 400; guard += 1, fiber = fiber.return) {
      if (!tags.has(fiber.tag)) continue;
      const name = nameOf(fiber.type);
      const raw = fiber._debugStack && fiber._debugStack.stack;
      const stack = typeof raw === 'string' ? raw.split('\\n').slice(0, 12).join('\\n').slice(0, ${OWNER_STACK_MAX}) : '';
      const last = owners[owners.length - 1];
      if (/^[A-Z]/.test(name) && stack && (!last || last.stack !== stack)) owners.push({ name: name.slice(0, 64), stack });
    }
    return owners;
  })`;
}

function probe(selector: string): string {
  return `(async (selector) => {
    let el;
    try { el = document.querySelector(selector); } catch { return null; }
    if (!el) return null;
    const app = await (${appSourceBody()})(el);
    return { tag: el.tagName.toLowerCase(), owners: ${ownerWalk()}(el), usedAt: app?.usedAt ?? null };
  })(${JSON.stringify(selector)})`;
}

export async function probeOwners(preview: PreviewService, url: string, selector: string): Promise<ProbedElement | null> {
  const raw = await probeOnPage<RawProbe | null>(preview, url, { width: 1440, height: 900 }, probe(selector));
  return raw ? { tag: raw.tag, owners: raw.owners, usedAt: parseLoc(raw.usedAt) } : null;
}

export function parseLoc(raw: string | null): SourceLoc | null {
  const match = raw ? /^(.+):(\d+):(\d+)$/.exec(raw) : null;
  return match ? { file: match[1] as string, line: Number(match[2]), col: Number(match[3]) } : null;
}
