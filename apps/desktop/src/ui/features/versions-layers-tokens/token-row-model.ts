import type { CompiledTokenEntry } from "@design-studio/contracts";

import type { PendingToken } from "./token-draft.js";

const toTokenTitle = (entry: CompiledTokenEntry): string => {
  if (entry.source) {
    let dark = "";

    if (entry.source.darkLine) {
      dark = `, dark line ${entry.source.darkLine}`;
    }

    return `${entry.cssVar}: ${entry.source.file} line ${entry.source.line}${dark}`;
  }

  let description = "";

  if (entry.description) {
    description = `: ${entry.description}`;
  }

  return `${entry.cssVar} (${entry.path})${description}`;
};

const isRowChanged = (pending: PendingToken | undefined): boolean => {
  if (!pending) {
    return false;
  }

  return Object.hasOwn(pending, "value") || Object.hasOwn(pending, "darkValue");
};

const toRowClass = (isChanged: boolean, hasDark: boolean): string => {
  const names = ["tkp-row"];

  if (isChanged) {
    names.push("changed");
  }

  if (hasDark) {
    names.push("has-dark");
  }

  return names.join(" ");
};

export { isRowChanged, toRowClass, toTokenTitle };
