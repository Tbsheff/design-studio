const HEADLESS_MATCH = "window.__studioSelectMatching";

const matchReadyExpression = (): string =>
  `typeof ${HEADLESS_MATCH} === 'function'`;

const matchExpression = (css: string, by: string): string =>
  `${HEADLESS_MATCH}(${JSON.stringify(css)}, ${JSON.stringify(by)})`;

export { matchExpression, matchReadyExpression };
