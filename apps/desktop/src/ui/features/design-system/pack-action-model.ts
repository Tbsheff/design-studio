import type { PackSummary } from "@design-studio/contracts";

import { COPY } from "./copy.js";
import type { PackDetailActions } from "./pack-detail-actions.js";

type PackActionKind =
  | "apply"
  | "copy"
  | "delete"
  | "duplicate"
  | "export"
  | "openEditor"
  | "rename"
  | "useInNew";

interface PackActionSpec {
  readonly hasIcon: boolean;
  readonly isTask: boolean;
  readonly label: string;
  readonly run: (
    actions: PackDetailActions,
    pack: PackSummary
  ) => Promise<void> | null;
  readonly tone: string;
}

const toDone = async (task: Promise<void> | undefined): Promise<void> => {
  await task;
};

const SPECS: Record<PackActionKind, PackActionSpec> = {
  apply: {
    hasIcon: false,
    isTask: true,
    label: COPY.textApplyToCurrentProject,
    run: (actions, pack) => toDone(actions.onApply?.(pack)),
    tone: "btn primary small",
  },
  copy: {
    hasIcon: false,
    isTask: true,
    label: COPY.textMakeACopyTo,
    run: (actions, pack) => actions.onDuplicate(pack),
    tone: "btn small",
  },
  delete: {
    hasIcon: false,
    isTask: false,
    label: COPY.textDelete,
    run: (actions, pack) => {
      actions.onDelete(pack);

      return null;
    },
    tone: "btn ghost danger small",
  },
  duplicate: {
    hasIcon: false,
    isTask: true,
    label: COPY.textDuplicate,
    run: (actions, pack) => actions.onDuplicate(pack),
    tone: "btn small",
  },
  export: {
    hasIcon: true,
    isTask: true,
    label: COPY.textExport,
    run: (actions, pack) => actions.onExport(pack),
    tone: "btn small has-icon",
  },
  openEditor: {
    hasIcon: false,
    isTask: true,
    label: COPY.textOpenInEditor,
    run: (actions, pack) => actions.onOpenEditor(pack),
    tone: "btn small",
  },
  rename: {
    hasIcon: false,
    isTask: false,
    label: COPY.textRename,
    run: (actions, pack) => {
      actions.onRename(pack);

      return null;
    },
    tone: "btn small",
  },
  useInNew: {
    hasIcon: false,
    isTask: false,
    label: COPY.textUseInNewProject,
    run: (actions, pack) => {
      actions.onUseInNew(pack);

      return null;
    },
    tone: "btn small",
  },
};

const toActionTone = (
  kind: PackActionKind,
  actions: PackDetailActions
): string => {
  if (kind === "useInNew" && !actions.onApply) {
    return "btn small primary";
  }

  return SPECS[kind].tone;
};

const toActionKinds = (
  pack: PackSummary,
  actions: PackDetailActions
): PackActionKind[] => {
  const isUser = pack.source === "user";
  const isUsable = !pack.draft;
  const kinds: PackActionKind[] = [];

  if (actions.onApply && isUsable) {
    kinds.push("apply");
  }

  if (isUsable) {
    kinds.push("useInNew");
  }

  if (isUser) {
    kinds.push("openEditor", "duplicate", "rename");
  } else {
    kinds.push("copy");
  }

  kinds.push("export");

  if (isUser) {
    kinds.push("delete");
  }

  return kinds;
};

export { SPECS, toActionKinds, toActionTone };

export type { PackActionKind, PackActionSpec };
