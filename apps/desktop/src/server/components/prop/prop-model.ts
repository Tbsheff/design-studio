import type { PropWork } from "./prop-plan.js";

interface PropChange {
  readonly callSites: PropWork["callSites"];
  readonly component: string;
  readonly default: string | null;
  readonly files: readonly string[];
  readonly kind: PropWork["kind"];
  readonly name: string;
  readonly newName: string | null;
  readonly note: string | null;
  readonly title: string;
  readonly versionId: string | null;
}

const toChangeResult = (
  work: PropWork,
  versionId: string | null
): PropChange => ({
  callSites: work.callSites,
  component: work.component,
  default: work.default,
  files: work.changes.map((change) => change.relative),
  kind: work.kind,
  name: work.name,
  newName: work.newName,
  note: work.note,
  title: work.title,
  versionId,
});

export { toChangeResult };

export type { PropChange };
