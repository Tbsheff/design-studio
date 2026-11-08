const toMeasureExpression = (selector: string): string =>
  `((selector) => {
    let el = null;
    try { el = document.querySelector(selector); } catch { el = null; }
    if (!el) return null;
    const cs = getComputedStyle(el);
    const box = el.getBoundingClientRect();
    const names = new Set();
    const walk = (rules) => {
      for (const rule of rules) {
        if (rule.style) {
          for (const prop of rule.style) { if (prop.startsWith('--')) names.add(prop); }
        }
        if (rule.cssRules) walk(rule.cssRules);
      }
    };
    for (const sheet of document.styleSheets) {
      try { walk(sheet.cssRules); } catch { continue; }
    }
    const root = getComputedStyle(document.documentElement);
    const known = [...names].filter((name) => root.getPropertyValue(name).trim() !== '');
    const holder = document.createElement('div');
    holder.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;color:rgb(1,2,3);font-size:7.77px';
    const probe = document.createElement('div');
    holder.appendChild(probe);
    document.body.appendChild(holder);
    const read = (prop, value) => {
      probe.style.removeProperty(prop);
      probe.style.setProperty(prop, value);
      const out = getComputedStyle(probe).getPropertyValue(prop);
      probe.style.removeProperty(prop);
      return out;
    };
    const HINTS = {
      'background-color': /bg|background|surface|color|fill/i,
      'border-radius': /radius|round|corner/i,
      color: /text|fg|foreground|color|ink/i,
      'font-size': /font|text|size|type/i,
      gap: /space|spacing|gap|size/i,
      padding: /space|spacing|pad|size/i,
    };
    const tokenOf = (prop, value) => {
      const none = read(prop, 'var(--studio-dev-note-none)');
      if (value === none) return null;
      const hits = known.filter((name) => read(prop, 'var(' + name + ')') === value);
      const hint = HINTS[prop.startsWith('padding') ? 'padding' : prop];
      const best = hits.find((name) => hint && hint.test(name));
      return best || hits[0] || null;
    };
    const measured = (prop, value) => ({ token: tokenOf(prop, value), value });
    const out = {
      background: measured('background-color', cs.backgroundColor),
      box: { height: box.height, width: box.width, x: box.x, y: box.y },
      color: measured('color', cs.color),
      font: {
        family: cs.fontFamily,
        lineHeight: cs.lineHeight,
        size: measured('font-size', cs.fontSize),
        weight: cs.fontWeight,
      },
      gap: measured('gap', cs.gap),
      padding: {
        bottom: measured('padding-bottom', cs.paddingBottom),
        left: measured('padding-left', cs.paddingLeft),
        right: measured('padding-right', cs.paddingRight),
        top: measured('padding-top', cs.paddingTop),
      },
      radius: measured('border-radius', cs.borderRadius),
    };
    holder.remove();
    return out;
  })(${JSON.stringify(selector)})`;

export { toMeasureExpression };
