import { SOURCE_LOC_ATTR } from "@design-studio/contracts";

import { toAppSourceBody, toOwnerWalkSource } from "./owner-source.js";

const STYLE_KEYS = [
  "display",
  "position",
  "color",
  "background-color",
  "font-family",
  "font-size",
  "font-weight",
  "line-height",
  "padding",
  "margin",
  "border-radius",
  "width",
  "height",
  "gap",
  "object-fit",
  "object-position",
  "background-image",
];

const toProbeBody = (): string => `(async (selector) => {
    let el;
    try { el = document.querySelector(selector); } catch { return null; }
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const styles = {};
    for (const key of ${JSON.stringify(STYLE_KEYS)}) styles[key] = cs.getPropertyValue(key);
    const ancestors = [];
    for (let p = el.parentElement; p && ancestors.length < 6; p = p.parentElement) ancestors.push(p.tagName.toLowerCase() + (p.id ? '#' + p.id : ''));
    const tagged = el.getAttribute(${JSON.stringify(SOURCE_LOC_ATTR)});
    const app = tagged ? null : await (${toAppSourceBody()})(el);
    return { tag: el.tagName.toLowerCase(), text: (el.textContent || '').trim().slice(0, 2000), outerHTML: el.outerHTML.slice(0, 10000), styles, rect: { x: Math.round(r.x), y: Math.round(r.y + scrollY), width: Math.round(r.width), height: Math.round(r.height) }, loc: tagged || app?.loc || null, usedAt: app?.usedAt ?? null, usedBy: app?.usedBy ?? null, owners: ${toOwnerWalkSource()}(el), ancestors };
  })`;

const toElementProbeSource = (selector: string): string =>
  `(${toProbeBody()})(${JSON.stringify(selector)})`;

const toElementsProbeSource = (selectors: string[]): string =>
  `Promise.all((${JSON.stringify(selectors)}).map(${toProbeBody()}))`;

export { toElementProbeSource, toElementsProbeSource };
