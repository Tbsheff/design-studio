const axeRunExpression = (rules: readonly string[]): string =>
  `window.axe.run(document, { runOnly: { type: 'rule', values: ${JSON.stringify(rules)} }, resultTypes: ['violations'] }).then((result) => result.violations)`;

export { axeRunExpression };
