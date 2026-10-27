export interface LiveStyle {
  color: string;
  bg: string;
  font: string;
  size: string;
  weight: string;
  radius: string;
  shadow: string;
  borderColor: string;
  borderWidth: string;
  text: number;
}

export interface LiveFontFace {
  family: string;
  src: string;
  weight: string;
  loaded: boolean;
}

export interface LiveSheet {
  url: string;
  css: string;
}

export interface LivePage {
  title: string;
  text: string;
  textLength: number;
  hasPassword: boolean;
  darkHint: boolean;
  themeColor: string | null;
  fontLinks: string[];
  docHeight: number;
  roles: Record<string, LiveStyle[]>;
  cards: LiveStyle[];
  painted: Array<[string, number]>;
  inks: Array<[string, number]>;
  borders: Array<[string, number]>;
  radii: Array<[string, number]>;
  shadows: Array<[string, number]>;
  gaps: Array<[number, number]>;
  families: Array<[string, number]>;
  fontFaces: LiveFontFace[];
  vars: Record<string, string>;
  bodyVars: Record<string, string>;
  sheets: LiveSheet[];
  crossOrigin: string[];
  logo: { alt: string; kind: string; width: number; height: number } | null;
  elements: number;
}

export const COLLECT_SCRIPT = String.raw`(async () => {
  const started = performance.now();
  const inBudget = () => performance.now() - started < 4000;
  const doc = document;
  const root = doc.documentElement;
  const body = doc.body || root;
  const MAX_ELEMENTS = 5000;
  const MAX_SHEET_CHARS = 1500000;
  const MAX_TOTAL_CHARS = 6000000;
  const clear = (c) => !c || c === 'transparent' || /^rgba\([^)]*,\s*0\)$/.test(c) || /\/\s*0\)$/.test(c);
  const tally = () => new Map();
  const bump = (map, key, by) => { if (key === undefined || key === null || key === '') return; map.set(key, (map.get(key) || 0) + by); };
  const ranked = (map, limit) => [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    const s = getComputedStyle(el);
    return s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) > 0.05;
  };
  const ownText = (el) => {
    let n = 0;
    for (const child of el.childNodes) if (child.nodeType === 3) n += child.textContent.trim().length;
    return n;
  };
  const pick = (el) => {
    const s = getComputedStyle(el);
    return { color: s.color, bg: s.backgroundColor, font: s.fontFamily, size: s.fontSize, weight: s.fontWeight, radius: s.borderTopLeftRadius, shadow: s.boxShadow, borderColor: s.borderTopColor, borderWidth: s.borderTopWidth, text: (el.textContent || '').trim().length };
  };
  const ROLES = {
    body: 'body',
    h1: 'h1', h2: 'h2', h3: 'h3', p: 'p',
    a: 'a[href]',
    button: 'button, [role=button], input[type=submit], a[class*=btn i], a[class*=button i]',
    input: 'input:not([type=hidden]):not([type=submit]):not([type=checkbox]):not([type=radio]), textarea, select',
    nav: 'nav', header: 'header, [role=banner]', footer: 'footer, [role=contentinfo]',
    code: 'code, pre, kbd', small: 'small, figcaption, .text-muted, .muted, .caption'
  };
  const roles = {};
  for (const [name, selector] of Object.entries(ROLES)) {
    let list = [];
    try { list = [...doc.querySelectorAll(selector)].slice(0, 300); } catch { list = []; }
    roles[name] = list.filter(visible).slice(0, 16).map(pick);
  }
  const all = [...body.getElementsByTagName('*')].slice(0, MAX_ELEMENTS);
  const radii = tally(), shadows = tally(), gaps = tally(), families = tally(), inks = tally(), borders = tally();
  const cards = [];
  for (const el of all) {
    if (!inBudget()) break;
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden') continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    const radius = s.borderTopLeftRadius;
    if (radius && radius !== '0px') bump(radii, radius, 1);
    if (s.boxShadow && s.boxShadow !== 'none') bump(shadows, s.boxShadow, 1);
    const bw = parseFloat(s.borderTopWidth) || 0;
    if (bw > 0 && s.borderTopStyle !== 'none' && !clear(s.borderTopColor)) bump(borders, s.borderTopColor, (r.width + r.height) * 2 * bw);
    const t = ownText(el);
    if (t > 0) {
      bump(families, s.fontFamily, t);
      bump(inks, s.color, t * Math.pow(parseFloat(s.fontSize) || 16, 2) / 256);
    }
    const tag = el.tagName.toLowerCase();
    const cardish = radius !== '0px' && (s.boxShadow !== 'none' || bw > 0) && r.width >= 120 && r.height >= 80 && tag !== 'button' && tag !== 'input' && cards.length < 16;
    if (cardish) cards.push(pick(el));
    if (s.rowGap && s.rowGap !== 'normal' && (s.display.includes('flex') || s.display.includes('grid'))) {
      const g = Math.round(parseFloat(s.rowGap));
      if (g > 0 && g <= 160) bump(gaps, g, 1);
    }
    const kids = [...el.children].slice(0, 40);
    let prev = null;
    for (const kid of kids) {
      const kr = kid.getBoundingClientRect();
      if (kr.width < 1 || kr.height < 1) continue;
      if (prev && kr.top >= prev.bottom && Math.min(kr.right, prev.right) - Math.max(kr.left, prev.left) > 0) {
        const g = Math.round(kr.top - prev.bottom);
        if (g > 0 && g <= 160) bump(gaps, g, 1);
      }
      prev = kr;
    }
  }
  const painted = tally();
  const vw = innerWidth, vh = innerHeight;
  const docHeight = Math.max(root.scrollHeight, body.scrollHeight || 0);
  const stops = [0, vh, vh * 2].filter((y) => y === 0 || y < docHeight - vh / 2);
  const bgAt = (el) => {
    let node = el;
    while (node && node.nodeType === 1) {
      const c = getComputedStyle(node).backgroundColor;
      if (!clear(c)) return c;
      node = node.parentElement;
    }
    const rc = getComputedStyle(root).backgroundColor;
    return clear(rc) ? 'rgb(255, 255, 255)' : rc;
  };
  for (const y of stops) {
    if (!inBudget()) break;
    window.scrollTo(0, y);
    await new Promise((done) => requestAnimationFrame(() => done(null)));
    for (let py = 10; py < vh; py += 24) {
      for (let px = 10; px < vw; px += 24) {
        const el = doc.elementFromPoint(px, py);
        if (el) bump(painted, bgAt(el), 1);
      }
    }
  }
  window.scrollTo(0, 0);
  const sheets = [];
  const crossOrigin = [];
  const faces = [];
  const varNames = new Set();
  let total = 0;
  const walkRules = (rules) => {
    for (const rule of rules) {
      if (rule.type === 5 && faces.length < 60) faces.push({ family: rule.style.getPropertyValue('font-family').replace(/["']/g, '').trim(), src: rule.style.getPropertyValue('src').slice(0, 400), weight: rule.style.getPropertyValue('font-weight') });
      if (rule.cssRules) walkRules(rule.cssRules);
    }
  };
  const allSheets = [...doc.styleSheets, ...(doc.adoptedStyleSheets || [])];
  for (const sheet of allSheets) {
    if (sheets.length >= 40 || total >= MAX_TOTAL_CHARS) break;
    let rules;
    try { rules = sheet.cssRules; } catch { if (sheet.href) crossOrigin.push(sheet.href); continue; }
    if (!rules) continue;
    let css = '';
    for (const rule of rules) {
      if (css.length > MAX_SHEET_CHARS) break;
      css += rule.cssText + '\n';
    }
    try { walkRules(rules); } catch {}
    total += css.length;
    for (const m of css.matchAll(/(--[A-Za-z0-9_-]{1,80})\s*:/g)) if (varNames.size < 3000) varNames.add(m[1]);
    sheets.push({ url: sheet.href || 'inline', css });
  }
  for (let i = 0; i < root.style.length; i++) if (root.style[i].startsWith('--')) varNames.add(root.style[i]);
  const rootStyle = getComputedStyle(root);
  const bodyStyle = getComputedStyle(body);
  const vars = {};
  const bodyVars = {};
  for (const name of varNames) {
    const v = rootStyle.getPropertyValue(name).trim();
    if (v && v.length < 300) vars[name] = v;
    const b = bodyStyle.getPropertyValue(name).trim();
    if (b && b.length < 300 && b !== v) bodyVars[name] = b;
  }
  const loadedFamilies = new Set();
  try { doc.fonts.forEach((f) => { if (f.status === 'loaded') loadedFamilies.add(f.family.replace(/["']/g, '').trim().toLowerCase()); }); } catch {}
  const fontFaces = faces.map((f) => ({ ...f, loaded: loadedFamilies.has(f.family.toLowerCase()) }));
  const scope = doc.querySelector('header, [role=banner]') || doc.querySelector('nav') || body;
  const logoText = (el) => {
    const a = el.closest('a');
    return [el.getAttribute('alt'), el.getAttribute('class'), el.id, el.getAttribute('aria-label'), el.getAttribute('src'), el.getAttribute('title'), el.parentElement && el.parentElement.getAttribute('class'), a && a.getAttribute('aria-label'), a && a.getAttribute('class'), a && a.id].filter(Boolean).join(' ');
  };
  const picturesIn = (where) => [...where.querySelectorAll('img, svg')].slice(0, 400).filter((el) => !(el.tagName.toLowerCase() === 'svg' && el.parentElement && el.parentElement.closest('svg'))).filter((el) => {
    if (!visible(el)) return false;
    const r = el.getBoundingClientRect();
    return r.top < 320 && r.width >= 16 && r.height >= 10 && r.width <= 600;
  }).slice(0, 40);
  let pictures = picturesIn(scope);
  if (!pictures.some((el) => /logo|brand/i.test(logoText(el))) && scope !== body) {
    const wider = picturesIn(body).filter((el) => /logo|brand/i.test(logoText(el)));
    if (wider.length > 0 || pictures.length === 0) pictures = [...wider, ...pictures];
  }
  const homeLink = (el) => { const a = el.closest('a'); if (!a) return false; try { const u = new URL(a.href); return u.origin === location.origin && (u.pathname === '/' || u.pathname === ''); } catch { return false; } };
  const logo = pictures.find((el) => /logo|brand/i.test(logoText(el))) || pictures.find(homeLink) || pictures[0] || null;
  let logoInfo = null;
  if (logo) {
    const r = logo.getBoundingClientRect();
    logo.setAttribute('data-studio-logo', '1');
    logoInfo = { alt: (logo.getAttribute('alt') || logo.getAttribute('aria-label') || '').slice(0, 120), kind: logo.tagName.toLowerCase(), width: Math.round(r.width), height: Math.round(r.height) };
  }
  const htmlTheme = ((root.getAttribute('class') || '') + ' ' + (root.getAttribute('data-theme') || '') + ' ' + (root.getAttribute('data-color-mode') || '') + ' ' + (body.getAttribute('class') || '')).toLowerCase();
  const themeMeta = doc.querySelector('meta[name="theme-color"]');
  const fontLinks = [...doc.querySelectorAll('link[href*="fonts.googleapis.com/css"]')].map((l) => l.href).slice(0, 5);
  const text = (body.innerText || '').slice(0, 4000);
  return {
    title: (doc.title || '').slice(0, 200),
    text,
    textLength: (body.innerText || '').length,
    hasPassword: [...doc.querySelectorAll('input[type=password]')].some(visible),
    darkHint: /\bdark\b/.test(htmlTheme),
    themeColor: themeMeta ? themeMeta.getAttribute('content') : null,
    fontLinks,
    docHeight,
    roles,
    cards,
    painted: ranked(painted, 24),
    inks: ranked(inks, 24),
    borders: ranked(borders, 12),
    radii: ranked(radii, 16),
    shadows: ranked(shadows, 12),
    gaps: ranked(gaps, 24),
    families: ranked(families, 12),
    fontFaces,
    vars,
    bodyVars,
    sheets,
    crossOrigin,
    logo: logoInfo,
    elements: all.length
  };
})()`;
