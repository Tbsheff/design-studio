import type {
  CompiledTokenEntry,
  DirectStyleProperty,
} from "@design-studio/contracts";
import { useAnchoredPopover } from "@design-studio/ui";
import { useMemo } from "react";
import type { ReactNode } from "react";

import type { TokenFieldState } from "../../../shared/token-match.js";
import type { DirectEdit } from "../inspector/use-direct-edit.js";
import { useTokenUi } from "../inspector/use-token-snap.js";
import { toFieldView } from "./token-control-model.js";
import { TokenControlPopup } from "./token-control-popup.js";
import { TokenControlTrigger } from "./token-control-trigger.js";
import { useTokenControlActions } from "./use-token-control-actions.js";

type View = "picker";

const NO_ENTRIES: CompiledTokenEntry[] = [];

interface ControlProps {
  edit: DirectEdit;
  label: string;
  prop: DirectStyleProperty;
  targets?: DirectStyleProperty[];
  variant?: "field" | "mini";
}

const toFieldAnchor = (trigger: HTMLElement): HTMLElement =>
  trigger.closest<HTMLElement>(".ins-field, .side-cell") ?? trigger;

const toNearClass = (state: TokenFieldState): string => {
  if (state.kind === "raw" && state.snap) {
    return "near";
  }

  return "";
};

const TokenControl = ({
  edit,
  label,
  prop,
  targets: requested,
  variant = "field",
}: ControlProps): ReactNode => {
  const ui = useTokenUi();
  const pop = useAnchoredPopover<View, HTMLDialogElement>(toFieldAnchor);
  const { close, open, trigger, view } = pop;
  const { commit, preview } = edit;
  const entries = ui?.entries ?? NO_ENTRIES;
  const mode = ui?.mode ?? "light";
  const requestCreate = ui?.requestCreate ?? null;
  const value = edit.values[prop];
  const targets = useMemo(() => requested ?? [prop], [prop, requested]);

  const { current, nearest, pool, state } = toFieldView(
    prop,
    value,
    entries,
    mode
  );

  const { create, handleToggle, handleWrite } = useTokenControlActions({
    close,
    commit,
    open,
    preview,
    prop,
    requestCreate,
    targets,
    value,
    view,
  });

  if (pool.length === 0) {
    return null;
  }

  return (
    <span
      className={`tk-control ${variant} ${state.kind} ${toNearClass(state)}`}
      ref={trigger}
    >
      <TokenControlTrigger
        current={current}
        entries={entries}
        isExpanded={view === "picker"}
        label={label}
        mode={mode}
        onToggle={handleToggle}
        state={state}
        variant={variant}
      />
      {view && (
        <TokenControlPopup
          current={current}
          label={label}
          mode={mode}
          nearest={nearest}
          onCreate={create}
          onWrite={handleWrite}
          panel={pop.panel}
          pool={pool}
          state={state}
          popStyle={pop.style}
        />
      )}
    </span>
  );
};

export { TokenControl };
