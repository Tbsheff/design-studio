const LAYOUT_EXPRESSION = `(() => {
  const SKIP = new Set(['SCRIPT', 'STYLE', 'LINK', 'NOSCRIPT', 'TEMPLATE', 'META']);
  const box = (el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.left + scrollX), y: Math.round(r.top + scrollY), width: Math.round(r.width), height: Math.round(r.height) }; };
  const area = (el) => { const r = el.getBoundingClientRect(); return r.width * r.height; };
  const shown = (el) => {
    if (SKIP.has(el.tagName)) return false;
    const s = getComputedStyle(el);
    return area(el) >= 400 && s.display !== 'none' && s.visibility !== 'hidden' && s.position !== 'fixed';
  };
  const name = (el) => {
    const cls = [...el.classList].filter((c) => /^[\\w-]+$/.test(c)).slice(0, 4);
    return el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + cls.map((c) => '.' + c).join('');
  };
  const main = [...document.querySelectorAll('main, [role=main]')].filter(shown).sort((a, b) => area(b) - area(a))[0];
  if (!main) return null;
  let column = main;
  for (let step = 0; step < 6; step++) {
    const kids = [...column.children].filter(shown).sort((a, b) => area(b) - area(a));
    const big = kids[0];
    if (!big) break;
    if (kids.length === 1) { column = big; continue; }
    if (area(big) >= 0.6 * area(column)) column = big;
    break;
  }
  const owners = [];
  const fiberKey = Object.keys(main).find((key) => key.startsWith('__reactFiber$'));
  let owner = fiberKey ? main[fiberKey]?._debugOwner : null;
  while (owner && owners.length < 4) {
    const type = owner.type && typeof owner.type !== 'string' ? owner.type : null;
    const label = owner.name || type?.displayName || type?.name;
    if (typeof label === 'string' && label && !owners.includes(label)) owners.push(label);
    owner = owner._debugOwner;
  }
  const outside = {};
  for (let node = main; node && node !== document.documentElement; node = node.parentElement) {
    const parent = node.parentElement;
    if (!parent) break;
    for (const sibling of parent.children) {
      if (sibling === node || !shown(sibling)) continue;
      const key = name(sibling);
      outside[key] = (outside[key] || 0) + 1;
    }
  }
  const norm = (text) => text.replace(/\\s+/g, ' ').trim();
  const ownText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
  const rowsOf = (root, max) => [...root.querySelectorAll('*')].filter((el) => ownText(el) && el.getClientRects().length).map((el) => norm(el.innerText || '')).filter((t) => t.length >= 2 && t.length <= 160).slice(0, max);
  const cardLike = (el) => { const s = getComputedStyle(el); return el.dataset.slot === 'card' || (s.boxShadow !== 'none' && area(el) > 4000) || (parseFloat(s.borderTopWidth) > 0 && parseFloat(s.borderLeftWidth) > 0 && parseFloat(s.borderTopLeftRadius) > 0 && area(el) > 4000); };
  const cards = [...main.querySelectorAll('*')].filter((el) => shown(el) && cardLike(el)).slice(0, 60).map((el) => ({ name: name(el), box: box(el), rows: rowsOf(el, 40) })).filter((c) => c.rows.length);
  const holder = column === main ? main : column;
  const hs = getComputedStyle(holder);
  const contentWidth = Math.round(holder.getBoundingClientRect().width - parseFloat(hs.paddingLeft) - parseFloat(hs.paddingRight));
  return { main: name(main), mainBox: box(main), column: column === main ? null : name(column), columnBox: column === main ? null : box(column), owners, outside, contentWidth, rows: rowsOf(main, 800), cards };
})()`;

export { LAYOUT_EXPRESSION };
