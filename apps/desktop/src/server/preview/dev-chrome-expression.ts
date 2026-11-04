const toDevChromeExpression = (selector: string): string =>
  `(() => {
    const LOC = '[data-studio-loc]';
    const seen = new WeakMap();
    let tagged = null;
    const fiberOf = (node) => { const key = Object.keys(node).find((k) => k.startsWith('__reactFiber$')); return key ? node[key] : null; };
    const fromPackage = (node) => {
      const stack = fiberOf(node)?._debugStack?.stack;
      const line = typeof stack === 'string' ? stack.split('\\n').slice(1).find((l) => !/react|next[_/-]dist|<anonymous>/i.test(l)) : null;
      return Boolean(line && /node_modules/.test(line));
    };
    const pinnedChrome = (node) => {
      const position = getComputedStyle(node).position;
      if (position !== 'fixed' && position !== 'sticky') return false;
      const loc = node.closest(LOC)?.getAttribute('data-studio-loc') ?? node.querySelector(LOC)?.getAttribute('data-studio-loc') ?? null;
      if (loc) return loc.includes('node_modules/');
      tagged ??= document.querySelector(LOC) !== null;
      return tagged || fromPackage(node);
    };
    const check = (node) => {
      if (!node || node === document.body || node === document.documentElement) return false;
      if (seen.has(node)) return seen.get(node);
      const verdict = node.matches(${JSON.stringify(selector)}) || pinnedChrome(node) || check(node.parentElement);
      seen.set(node, verdict);
      return verdict;
    };
    return (el) => Boolean(el && el.matches && check(el));
  })()`;

export { toDevChromeExpression };
