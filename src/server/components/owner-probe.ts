import { OWNERS_MAX, OWNER_STACK_MAX, type ComponentOwner } from '../../shared/props.js';
import { waitForPage } from '../export/capture.js';
import type { PreviewService } from '../types.js';

export interface ProbedElement {
  tag: string;
  owners: ComponentOwner[];
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
  return `((selector) => {
    let el;
    try { el = document.querySelector(selector); } catch { return null; }
    if (!el) return null;
    return { tag: el.tagName.toLowerCase(), owners: ${ownerWalk()}(el) };
  })(${JSON.stringify(selector)})`;
}

export async function probeOwners(preview: PreviewService, url: string, selector: string): Promise<ProbedElement | null> {
  if (!preview.withPage) throw new Error('rendering is not available');
  return preview.withPage(url, { width: 1440, height: 900 }, async (page) => {
    await waitForPage(page);
    return page.evaluate<ProbedElement | null>(probe(selector));
  });
}
