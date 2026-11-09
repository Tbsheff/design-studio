import type { SelectionContext } from "@design-studio/contracts";
import { TRIGGER_LABELS } from "@design-studio/contracts/link-interaction";
import {
  ACTION_LABELS,
  transitionLabel,
} from "@design-studio/contracts/link-labels";
import {
  isFrameAction,
  LINK_ISSUE_TEXT,
  linkAction,
} from "@design-studio/contracts/links";
import type { PrototypeLink } from "@design-studio/contracts/links";

import { protoCopy } from "./proto-copy.js";
import { isSameRect } from "./prototype-model.js";
import type { LinkState } from "./use-link-rects.js";

const toArrowClass = (state: LinkState, selectedId: string | null): string => {
  const parts = ["link-arrow"];

  if (state.issue !== null) {
    parts.push("broken");
  }

  if (state.link.implicit) {
    parts.push("implicit");
  }

  if (state.link.action) {
    parts.push("overlay");
  }

  if (state.link.id === selectedId) {
    parts.push("selected");
  }

  return parts.join(" ");
};

const groupBrokenByFrame = (states: LinkState[]): Map<string, LinkState[]> => {
  const grouped = new Map<string, LinkState[]>();

  for (const state of states) {
    if (state.issue && state.issue !== "from-frame-missing") {
      const list = grouped.get(state.link.from.frame) ?? [];
      list.push(state);
      grouped.set(state.link.from.frame, list);
    }
  }

  return grouped;
};

const toBrokenTip = (list: LinkState[]): string =>
  list
    .map((state) => LINK_ISSUE_TEXT[state.issue ?? "element-missing"])
    .join("\n");

const linkOfSelection = (
  states: LinkState[],
  selection: SelectionContext | null,
  activeId: string
): LinkState | null => {
  if (!selection) {
    return null;
  }

  return (
    states.find(
      (state) =>
        state.link.from.frame === activeId &&
        (state.link.from.selector === selection.selector ||
          (state.rect !== null && isSameRect(state.rect, selection.rect)))
    ) ?? null
  );
};

const toActionMeta = (link: PrototypeLink): string => {
  const action = linkAction(link);

  if (!isFrameAction(action)) {
    return ACTION_LABELS[action];
  }

  if (action === "navigate") {
    return transitionLabel(link.transition);
  }

  return `${ACTION_LABELS[action]}, ${transitionLabel(link.transition).toLowerCase()}`;
};

const toRowMeta = (state: LinkState): string => {
  if (state.issue) {
    return LINK_ISSUE_TEXT[state.issue];
  }

  if (state.link.implicit) {
    return protoCopy.foundInPage;
  }

  const meta = toActionMeta(state.link);

  if (state.link.trigger) {
    return `${TRIGGER_LABELS[state.link.trigger.kind]}, ${meta}`;
  }

  return meta;
};

const pickEditing = (
  states: LinkState[],
  pinnedId: string | null,
  selected: LinkState | null
): LinkState | null => {
  const pinned = states.find((state) => state.link.id === pinnedId);

  return pinned ?? selected;
};

export {
  groupBrokenByFrame,
  linkOfSelection,
  pickEditing,
  toActionMeta,
  toArrowClass,
  toBrokenTip,
  toRowMeta,
};
