import type { Version } from "../../../shared/contracts.js";

interface RestoredResult {
  from: string;
  newVersionId: string;
  restored: true;
  title: string;
}

const restoredResult = (restored: Version, from: Version): RestoredResult => ({
  restored: true,
  newVersionId: restored.id,
  title: restored.title,
  from: from.id,
});

export { restoredResult };
