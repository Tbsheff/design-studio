import {
  elementClassInfo,
  fromGroupVariant,
  isGroupStateName,
} from "./deps.js";
import type {
  GroupPart,
  SourceLoc,
  StyleScope,
  StyleSite,
  StyleState,
} from "./deps.js";
import { StateStyleError } from "./errors.js";
import { toGroupAncestor } from "./group-ancestor.js";

const NEEDS_CLASSES =
  "Parent states work only in a Tailwind page. Use a layer state such as hover.";

const NEEDS_GROUP =
  "Add the group class to the parent layer in this file, then set the parent state.";

const toOwnGroupPart = (classes: readonly string[]): GroupPart | null => {
  for (const token of classes) {
    for (const part of token.split(":").slice(0, -1)) {
      const hit = fromGroupVariant(part);

      if (hit !== null) {
        return hit;
      }
    }
  }

  return null;
};

const toGroupNameFor = async (
  scope: StyleScope,
  site: StyleSite,
  source: SourceLoc,
  state: StyleState
): Promise<string | null> => {
  if (!isGroupStateName(state)) {
    return null;
  }

  if (site.theme === null) {
    throw new StateStyleError(NEEDS_CLASSES);
  }

  const ancestor = toGroupAncestor(site, source);

  if (ancestor !== null) {
    return ancestor.name;
  }

  const info = await elementClassInfo(
    scope.workTree,
    scope.project.kind,
    source
  );

  const own = toOwnGroupPart(info.tailwind?.classes ?? []);

  if (own === null) {
    throw new StateStyleError(NEEDS_GROUP);
  }

  return own.name;
};

export { toGroupNameFor, toOwnGroupPart };
