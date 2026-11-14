const INTERACTION_PROBE_SOURCE = String.raw`async (cap) => {
  const CONTROL = 'button, a[href], [role="button"], summary, input[type="submit"], input[type="button"], input[type="reset"]';
  const FOCUSABLE = 'button, a[href], summary, input, [tabindex]';
  const OUTLINE_OFF_CLASS = /(^|:)outline-(none|hidden|0)$/;
  const EMOJI = /^(?:(?![©®™])\p{Extended_Pictographic}(?:️|‍|\p{Emoji_Modifier})*){1,2}$/u;
  const nth = (el) => {
    const parent = el.parentElement;
    if (!parent) return el.tagName.toLowerCase();
    const same = [...parent.children].filter((c) => c.tagName === el.tagName);
    const tag = el.tagName.toLowerCase();
    return same.length > 1 ? tag + ':nth-of-type(' + (same.indexOf(el) + 1) + ')' : tag;
  };
  const selectorOf = (el) => {
    const parts = [];
    let node = el;
    while (node && node !== document.body && node !== document.documentElement) {
      if (node.id && document.querySelectorAll('#' + CSS.escape(node.id)).length === 1) {
        parts.unshift('#' + CSS.escape(node.id));
        return parts.join(' > ');
      }
      parts.unshift(nth(node));
      node = node.parentElement;
    }
    parts.unshift('body');
    return parts.join(' > ');
  };
  const shown = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) !== 0 && !el.closest('[aria-hidden="true"]');
  };
  const splitList = (text) => {
    const out = [];
    let depth = 0;
    let start = 0;
    for (let i = 0; i < text.length; i += 1) {
      const ch = text[i];
      if (ch === '(' || ch === '[') depth += 1;
      else if (ch === ')' || ch === ']') depth -= 1;
      else if (ch === ',' && depth === 0) { out.push(text.slice(start, i)); start = i + 1; }
    }
    out.push(text.slice(start));
    return out.map((part) => part.trim()).filter(Boolean);
  };
  const styleRules = [];
  const walk = (rules, parent) => {
    for (const rule of rules) {
      let selector = parent;
      if (rule.selectorText !== undefined) {
        const own = rule.selectorText;
        selector = parent ? splitList(own).map((part) => part.includes('&') ? part.split('&').join(':is(' + parent + ')') : ':is(' + parent + ') ' + part).join(', ') : own;
        styleRules.push({ selector, style: rule.style });
      }
      let children = null;
      try { children = rule.cssRules; } catch { children = null; }
      if (children && children.length > 0) walk(children, selector);
    }
  };
  for (const sheet of document.styleSheets) {
    let rules = null;
    try { rules = sheet.cssRules; } catch { rules = null; }
    if (rules) walk(rules, '');
  }
  const STATE = /:(hover|focus-visible|focus-within|focus)\b/g;
  const toBase = (part) => {
    const base = part.replace(STATE, '').replace(/:is\(\s*\)/g, '').trim();
    if (!base || /[>+~]$/.test(base)) return base + '*';
    return base;
  };
  const stateRules = (state) => {
    const out = [];
    for (const entry of styleRules) {
      for (const part of splitList(entry.selector)) {
        if (part.includes(':' + state)) out.push({ base: toBase(part), style: entry.style });
      }
    }
    return out;
  };
  const hoverRules = stateRules('hover');
  const matchesAny = (el, list) => list.some((entry) => { try { return el.matches(entry.base); } catch { return false; } });
  const setsOutlineOff = (el) => {
    const classes = [...el.classList];
    if (classes.some((cls) => OUTLINE_OFF_CLASS.test(cls))) return true;
    return styleRules.some((entry) => {
      const style = entry.style.getPropertyValue('outline-style') || entry.style.getPropertyValue('outline');
      const width = entry.style.getPropertyValue('outline-width');
      const off = /^(none|0|0px)$/.test(style.trim()) || /^(0|0px)$/.test(width.trim()) || (entry.style.getPropertyValue('outline-color') === 'transparent');
      if (!off) return false;
      return splitList(entry.selector).some((part) => { try { return el.matches(toBase(part)); } catch { return false; } });
    });
  };
  const ring = (el) => {
    const cs = getComputedStyle(el);
    return [cs.outlineStyle, cs.outlineWidth, cs.outlineColor, cs.boxShadow].join('|');
  };
  const stop = document.createElement('style');
  stop.textContent = '*, *::before, *::after { transition: none !important; animation: none !important; }';
  document.head.appendChild(stop);
  const before = document.activeElement;
  const controls = [];
  const focus = [];
  const candidates = [...document.querySelectorAll(CONTROL)].filter((el) => !el.disabled && el.getAttribute('aria-disabled') !== 'true' && shown(el)).slice(0, cap);
  for (const el of candidates) {
    const selector = selectorOf(el);
    const classes = [...el.classList];
    const hasHoverClass = classes.some((cls) => /(^|:)hover:/.test(cls));
    controls.push({
      selector,
      tag: el.tagName.toLowerCase(),
      classes,
      isLink: el.tagName === 'A' && el.getAttribute('role') !== 'button',
      isInProse: Boolean(el.parentElement && el.parentElement.closest('p')),
      hasHover: hasHoverClass || matchesAny(el, hoverRules),
    });
    if (!el.matches(FOCUSABLE)) continue;
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    const normal = ring(el);
    try { el.focus({ preventScroll: true, focusVisible: true }); } catch { continue; }
    if (document.activeElement !== el) continue;
    const focused = ring(el);
    el.blur();
    focus.push({ selector, isSame: normal === focused, isOutlineOff: setsOutlineOff(el) });
  }
  if (before && before !== document.body && before.focus) before.focus({ preventScroll: true });
  stop.remove();
  const images = [];
  const waitImage = (img) => new Promise((resolve) => {
    if (img.complete) { resolve(); return; }
    const done = () => resolve();
    img.addEventListener('load', done, { once: true });
    img.addEventListener('error', done, { once: true });
    setTimeout(done, 3000);
  });
  const imgs = [...document.querySelectorAll('img')].filter((img) => img.getAttribute('src') && img.loading !== 'lazy').slice(0, cap);
  await Promise.all(imgs.map(waitImage));
  for (const img of imgs) {
    if (!img.complete || img.naturalWidth > 0) continue;
    let broken = false;
    try { await img.decode(); } catch { broken = true; }
    if (broken) images.push({ selector: selectorOf(img), url: img.getAttribute('src') || img.currentSrc, via: 'img' });
  }
  const urls = new Map();
  for (const el of [...document.body.querySelectorAll('*')].slice(0, 5000)) {
    if (urls.size >= cap) break;
    const bg = getComputedStyle(el).backgroundImage;
    if (!bg || bg === 'none' || !shown(el)) continue;
    for (const match of bg.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) {
      const url = match[1];
      if (url.startsWith('data:') || urls.has(url)) continue;
      urls.set(url, el);
    }
  }
  const base = location.href.replace(/[?#].*$/, '').replace(/[^/]*$/, '');
  const loads = await Promise.all([...urls.entries()].map(([url, el]) => new Promise((resolve) => {
    const probe = new Image();
    const timer = setTimeout(() => resolve(null), 4000);
    probe.onload = () => { clearTimeout(timer); resolve(null); };
    probe.onerror = () => { clearTimeout(timer); resolve({ selector: selectorOf(el), url: url.startsWith(base) ? url.slice(base.length) : url, via: 'background' }); };
    probe.src = url;
  })));
  for (const hit of loads) if (hit) images.push(hit);
  const emoji = [];
  for (const el of [...document.body.querySelectorAll('button, [role="button"], a, summary, h1, h2, h3, h4, h5, h6, li, li > *, button *, [role="button"] *, h1 *, h2 *, h3 *, h4 *, h5 *, h6 *')].slice(0, 3000)) {
    if (emoji.length >= cap) break;
    const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent || '').join('').replace(/\s+/g, '');
    if (!own || !EMOJI.test(own) || !shown(el)) continue;
    const whole = (el.textContent || '').replace(/\s+/g, '');
    const isIcon = whole === own || (el.tagName === 'LI' && whole.startsWith(own)) || (el.parentElement && el.parentElement.tagName === 'LI' && el.parentElement.firstElementChild === el);
    if (isIcon) emoji.push({ selector: selectorOf(el), text: own });
  }
  return { controls, focus, images, emoji };
}`;

const toInteractionProbeExpression = (cap: number): string =>
  `(${INTERACTION_PROBE_SOURCE})(${JSON.stringify(cap)})`;

export { toInteractionProbeExpression };
