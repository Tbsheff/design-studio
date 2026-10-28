export interface ScreenStep {
  click?: string;
  force?: number;
}

export interface ViewMember {
  index: number;
  label: string;
  visible: boolean;
}

const PAGE_LIB = String.raw`
const VIEW_TOKEN = /(^|[-_ ])(view|screen|step|page|panel|pane|stage)s?($|[-_ ])/i;
const SKIP_TAGS = new Set(['LI', 'BUTTON', 'A', 'OPTION', 'SCRIPT', 'STYLE', 'TEMPLATE', 'LABEL', 'SPAN', 'INPUT', 'NAV', 'HEADER', 'FOOTER']);
const isHidden = (el) => {
  if (el.hidden || el.getAttribute('aria-hidden') === 'true') return true;
  const style = getComputedStyle(el);
  return style.display === 'none' || style.visibility === 'hidden';
};
const named = (el) => {
  const cls = typeof el.className === 'string' ? el.className : '';
  return VIEW_TOKEN.test(cls) || VIEW_TOKEN.test(el.id || '') || ['data-screen', 'data-view', 'data-page', 'data-step'].some((name) => el.hasAttribute(name));
};
const viewLike = (el) => !SKIP_TAGS.has(el.tagName) && (el.tagName === 'SECTION' || el.tagName === 'ARTICLE' || named(el));
const hasBody = (el) => el.querySelector('h1, h2, h3, form, [role=heading]') !== null && (el.textContent || '').trim().length >= 20;
const viewGroup = () => {
  const groups = new Map();
  for (const el of document.body.querySelectorAll('*')) {
    if (!viewLike(el) || !hasBody(el) || !el.parentElement) continue;
    const list = groups.get(el.parentElement) || [];
    list.push(el);
    groups.set(el.parentElement, list);
  }
  let best = [];
  for (const members of groups.values()) {
    if (members.length < 2) continue;
    const hidden = members.filter(isHidden).length;
    if (hidden === 0 || hidden === members.length) continue;
    if (members.length > best.length) best = members;
  }
  return best.slice(0, 12);
};
const labelOf = (el) => {
  const heading = el && el.querySelector('h1, h2, h3');
  const text = (heading && heading.textContent) || (el && (el.getAttribute('aria-label') || el.getAttribute('data-screen') || el.getAttribute('data-view') || el.id)) || '';
  return text.replace(/\s+/g, ' ').trim().slice(0, 40);
};
const signature = () => {
  const group = viewGroup();
  if (group.length) return 'v:' + group.map((m, i) => (isHidden(m) ? '' : String(i))).filter(Boolean).join(',');
  const h1 = document.querySelector('h1');
  return 'h:' + location.hash + '|' + ((h1 && h1.textContent) || '').trim().slice(0, 60);
};
const screenLabel = () => {
  const group = viewGroup();
  const shown = group.find((m) => !isHidden(m));
  return labelOf(shown || document.querySelector('main') || document.body) || document.title.slice(0, 40);
};
const cssPath = (el) => {
  const parts = [];
  for (let node = el; node && node !== document.body && node.nodeType === 1; node = node.parentElement) {
    let index = 1;
    for (let sibling = node.previousElementSibling; sibling; sibling = sibling.previousElementSibling) index += 1;
    parts.unshift(node.tagName.toLowerCase() + ':nth-child(' + index + ')');
  }
  return 'body>' + parts.join('>');
};
const CLICKABLE = 'button, a[href], [role=button], [role=tab], [data-go], [data-view-target], [data-target], [aria-controls], [onclick], input[type=submit]';
const rank = (el, shown) => {
  if (el.matches('[data-go], [data-view-target], [data-target], [aria-controls], a[href^="#"]')) return 0;
  return shown && shown.contains(el) ? 1 : 2;
};
const clickables = (cap) => {
  const shown = viewGroup().find((m) => !isHidden(m));
  const found = [];
  const shapes = new Map();
  for (const el of document.querySelectorAll(CLICKABLE)) {
    if (el.disabled || el.getClientRects().length === 0) continue;
    if (el.tagName === 'A') {
      const href = el.getAttribute('href') || '';
      if (!href.startsWith('#') && !href.startsWith('javascript:')) continue;
    }
    const path = cssPath(el);
    const shape = path.replace(/:nth-child\(\d+\)/g, '');
    shapes.set(shape, (shapes.get(shape) || 0) + 1);
    found.push({ path, shape, rank: rank(el, shown) });
  }
  const kept = new Set();
  const unique = found.filter((item) => {
    if (shapes.get(item.shape) < 3) return true;
    if (kept.has(item.shape)) return false;
    kept.add(item.shape);
    return true;
  });
  return unique.sort((a, b) => a.rank - b.rank).slice(0, cap).map((item) => item.path);
};
const force = (index) => {
  viewGroup().forEach((member, i) => {
    if (i === index) {
      member.hidden = false;
      member.removeAttribute('aria-hidden');
      if (getComputedStyle(member).display === 'none') member.style.setProperty('display', 'block', 'important');
    } else {
      member.hidden = true;
      member.style.setProperty('display', 'none', 'important');
    }
  });
};
const settle = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 60))));
`;

export function screenSignatureExpression(): string {
  return `(() => { ${PAGE_LIB} return { signature: signature(), label: screenLabel() }; })()`;
}

export function viewMembersExpression(): string {
  return `(() => { ${PAGE_LIB} return viewGroup().map((member, index) => ({ index, label: labelOf(member), visible: !isHidden(member) })); })()`;
}

export function clickablesExpression(cap: number): string {
  return `(() => { ${PAGE_LIB} return clickables(${cap}); })()`;
}

export function replayExpression(steps: readonly ScreenStep[]): string {
  return `(async () => { ${PAGE_LIB}
  for (const step of ${JSON.stringify(steps)}) {
    if (typeof step.force === 'number') force(step.force);
    else if (step.click) {
      const el = document.querySelector(step.click);
      if (!el) return false;
      el.click();
    }
    await settle();
  }
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  window.scrollTo(0, 0);
  return true;
})()`;
}
