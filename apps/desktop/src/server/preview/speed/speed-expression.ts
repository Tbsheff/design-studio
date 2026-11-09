import {
  inspectSpeedResources,
  inspectSpeedVitals,
  startSpeedWatch,
} from "./speed-page.probe.js";

const toExpression = <Value>(run: () => Value): string =>
  `(() => { const __name = (target) => target; return (${run.toString()})(); })()`;

const toWatchExpression = (): string => toExpression(startSpeedWatch);

const toVitalsExpression = (): string => toExpression(inspectSpeedVitals);

const toResourcesExpression = (): string => toExpression(inspectSpeedResources);

export { toResourcesExpression, toVitalsExpression, toWatchExpression };
