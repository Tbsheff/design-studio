import type {
  CompiledTokenEntry,
  DirectStyleProperty,
} from "@design-studio/contracts";
import { useAnchoredPopover } from "@design-studio/ui";
import { useCallback, useMemo } from "react";
import type { CSSProperties, ReactNode, RefObject } from "react";
import { createPortal } from "react-dom";

import {
  tokenFieldState,
  tokensForProperty,
} from "../../../shared/token-match.js";
import type {
  TokenFieldState,
  TokenMode,
} from "../../../shared/token-match.js";
import type { DirectEdit } from "../inspector/use-direct-edit.js";
import { useTokenUi } from "../inspector/use-token-snap.js";
import type { TokenUi } from "../inspector/use-token-snap.js";
import { COPY } from "./copy.js";
import { toMiniLabel, toMiniTip } from "./token-control-model.js";
import { TokenFieldButton } from "./token-field-button.js";
import { TokenPicker } from "./token-picker.js";
import { TokenRawMenu } from "./token-raw-menu.js";

type View = "picker";

interface ControlProps {
  edit: DirectEdit;
  label: string;
  prop: DirectStyleProperty;
  targets?: DirectStyleProperty[];
  variant?: "field" | "mini";
}

interface PopupProps {
  readonly current: string | null;
  readonly label: string;
  readonly mode: TokenMode;
  readonly nearest: string | null;
  readonly onCreate: (() => void) | null;
  readonly onWrite: (cssVar: string) => void;
  readonly panel: RefObject<HTMLDivElement | null>;
  readonly pool: CompiledTokenEntry[];
  readonly state: TokenFieldState;
  readonly popStyle: CSSProperties;
}

const toFieldAnchor = (trigger: HTMLElement): HTMLElement =>
  trigger.closest<HTMLElement>(".ins-field, .side-cell") ?? trigger;

const toNearClass = (state: TokenFieldState): string => {
  if (state.kind === "raw" && state.snap) {
    return "near";
  }

  return "";
};

const ControlPopup = ({
  current,
  label,
  mode,
  nearest,
  onCreate,
  onWrite,
  panel,
  pool,
  popStyle,
  state,
}: PopupProps): ReactNode => {
  const handleSnap = useCallback((): void => {
    if (state.kind === "raw" && state.snap) {
      onWrite(state.snap.cssVar);
    }
  }, [onWrite, state]);

  const handleChoose = useCallback(
    (choice: CompiledTokenEntry): void => {
      onWrite(choice.cssVar);
    },
    [onWrite]
  );

  return (
    <>
      {createPortal(
        <div
          className="tk-pop"
          ref={panel}
          style={popStyle}
          role="dialog"
          aria-label={`${label}${COPY.controlTokensSuffix}`}
        >
          {state.kind === "raw" && (
            <TokenRawMenu
              state={state}
              onSnap={handleSnap}
              onCreate={onCreate}
            />
          )}
          <TokenPicker
            label={label}
            entries={pool}
            mode={mode}
            current={current}
            nearest={nearest}
            onChoose={handleChoose}
          />
        </div>,
        document.body
      )}
    </>
  );
};

const Control = ({
  edit,
  label,
  prop,
  targets,
  ui,
  variant = "field",
}: ControlProps & { readonly ui: TokenUi }): ReactNode => {
  const pop = useAnchoredPopover<View>(toFieldAnchor);
  const { close, open, view } = pop;
  const { commit, preview } = edit;
  const { requestCreate } = ui;
  const value = edit.values[prop];
  const state = tokenFieldState(prop, value, ui.entries, ui.mode);
  const pool = tokensForProperty(prop, ui.entries);
  const props = useMemo(() => targets ?? [prop], [prop, targets]);

  let current: string | null = null;
  let nearest: string | null = null;

  if (state.kind === "token") {
    current = state.match.cssVar;
  }

  if (state.kind === "raw") {
    nearest = state.nearest?.cssVar ?? null;
  }

  const handleWrite = useCallback(
    (cssVar: string): void => {
      close(true);
      preview(
        Object.fromEntries(props.map((name) => [name, `var(${cssVar})`]))
      );
      commit();
    },
    [close, commit, preview, props]
  );

  const handleToggle = useCallback((): void => {
    if (view === "picker") {
      close(false);
    } else {
      open("picker");
    }
  }, [close, open, view]);

  const handleCreate = useCallback((): void => {
    close(false);
    requestCreate?.({ targets: props, prop, value });
  }, [close, prop, props, requestCreate, value]);

  let create: (() => void) | null = null;

  if (requestCreate) {
    create = handleCreate;
  }

  return (
    <span
      className={`tk-control ${variant} ${state.kind} ${toNearClass(state)}`}
      ref={pop.trigger}
    >
      {variant === "field" && (
        <TokenFieldButton
          state={state}
          entries={ui.entries}
          mode={ui.mode}
          label={label}
          isExpanded={view === "picker"}
          onClick={handleToggle}
        />
      )}
      {variant === "mini" && (
        <button
          type="button"
          className="tk-dot"
          aria-label={toMiniLabel(state, label)}
          data-tip={toMiniTip(state, current)}
          onClick={handleToggle}
        />
      )}
      {view && (
        <ControlPopup
          current={current}
          label={label}
          mode={ui.mode}
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

const TokenControl = (props: ControlProps): ReactNode => {
  const ui = useTokenUi();

  if (!ui || tokensForProperty(props.prop, ui.entries).length === 0) {
    return null;
  }

  return <Control {...props} ui={ui} />;
};

export { TokenControl };
