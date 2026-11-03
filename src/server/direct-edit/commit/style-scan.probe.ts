import type { StyleQuery } from "../../../shared/style-search.js";

const HEADLESS_SCAN = "window.__studioStyleScan";

const scanReadyExpression = (): string =>
  `typeof ${HEADLESS_SCAN} === 'function'`;

const scanQueryExpression = (query: StyleQuery): string =>
  `${HEADLESS_SCAN}(${JSON.stringify(query)})`;

export { scanQueryExpression, scanReadyExpression };
