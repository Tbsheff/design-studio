import { importSourcePage } from "./import-source.js";
// @generated
import { importPage } from "./import.js";
import { inspectMatchesPage } from "./inspect-matches.js";
import { inspectSourcePage } from "./inspect-source.js";
import { updateMatchesPage } from "./update-matches.js";

const PageActions = {
  importPage,
  importSourcePage,
  inspectMatchesPage,
  inspectSourcePage,
  updateMatchesPage,
} as const;

export { PageActions };
