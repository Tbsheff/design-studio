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
    const probe = document.createElement('div');
    probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none';
    document.body.appendChild(probe);
    const read = (prop, value) => {
      probe.style.removeProperty(prop);
      probe.style.setProperty(prop, value);
      const out = getComputedStyle(probe).getPropertyValue(prop);
      probe.style.removeProperty(prop);
      return out;
    };
    const tokenOf = (prop, value) => {
      const none = read(prop, 'var(--studio-dev-note-none)');
      if (value === none) return null;
      const hit = known.find((name) => read(prop, 'var(' + name + ')') === value);
      if (hit) return hit;
      return null;
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
    probe.remove();
    return out;
  })(${JSON.stringify(selector)})`;

export { toMeasureExpression };
