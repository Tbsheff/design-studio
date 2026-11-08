import type { CompiledTokenEntry } from "@design-studio/contracts";
import { useCallback } from "react";
import type { CSSProperties, ReactNode, RefObject } from "react";
import { createPortal } from "react-dom";

import type {
  TokenFieldState,
  TokenMode,
} from "../../../shared/token-match.js";
import { COPY } from "./copy.js";
import { TokenPicker } from "./token-picker.js";
import { TokenRawMenu } from "./token-raw-menu.js";

interface PopupProps {
  readonly current: string | null;
  readonly label: string;
  readonly mode: TokenMode;
  readonly nearest: string | null;
  readonly onCreate: (() => void) | null;
  readonly onWrite: (cssVar: string) => void;
  readonly panel: RefObject<HTMLDialogElement | null>;
  readonly pool: CompiledTokenEntry[];
  readonly state: TokenFieldState;
  readonly popStyle: CSSProperties;
}

const toPortalHost = (): HTMLElement => document.body;

const TokenControlPopup = ({
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
        <dialog
          open
          className="tk-pop"
          ref={panel}
          style={popStyle}
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
        </dialog>,
        toPortalHost()
      )}
    </>
  );
};

export { TokenControlPopup };
