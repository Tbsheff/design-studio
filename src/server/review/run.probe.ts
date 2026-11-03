const axeRunExpression = (context: string, rules: readonly string[]): string =>
  `window.axe.run(${context}, { runOnly: { type: 'rule', values: ${JSON.stringify(rules)} }, resultTypes: ['violations'] }).then((result) => result.violations)`;

const withinContextExpression = (within: string): string =>
  `document.querySelector(${JSON.stringify(within)})`;

const withinCountExpression = (within: string): string =>
  `(() => { try { return document.querySelectorAll(${JSON.stringify(within)}).length; } catch { return 0; } })()`;

const insideRootExpression = (root: string, selectors: string[]): string =>
  `(() => { const root = document.querySelector(${JSON.stringify(root)}); return ${JSON.stringify(selectors)}.map((s) => { if (!root || !s) return false; try { const el = document.querySelector(s); return Boolean(el && root.contains(el)); } catch { return false; } }); })()`;

export {
  axeRunExpression,
  insideRootExpression,
  withinContextExpression,
  withinCountExpression,
};
