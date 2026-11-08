import { useCallback, useRef } from "react";
import type { KeyboardEvent, ReactNode } from "react";

import type { TokenFieldState } from "../../../shared/token-match.js";
import { COPY } from "./copy.js";
import { findElements } from "./find-element.js";
import { CreateItem } from "./token-create-item.js";
import { SnapItem } from "./token-snap-item.js";

interface TokenRawMenuProps {
  readonly onCreate: (() => void) | null;
  readonly onSnap: () => void;
  readonly state: Extract<TokenFieldState, { kind: "raw" }>;
}

const toStep = (key: string): number | null => {
  if (key === "ArrowDown") {
    return 1;
  }

  if (key === "ArrowUp") {
    return -1;
  }

  return null;
};

const TokenRawMenu = ({
  onCreate,
  onSnap,
  state,
}: TokenRawMenuProps): ReactNode => {
  const list = useRef<HTMLDivElement>(null);
  const { snap } = state;
  let note: string = COPY.rawNotToken;

  if (snap) {
    note = COPY.rawNear;
  }

  const handleMenuKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>): void => {
      const step = toStep(event.key);

      if (step === null) {
        return;
      }

      event.preventDefault();

      let items: HTMLElement[] = [];

      if (list.current) {
        items = findElements(list.current, '[role="menuitem"]');
      }

      const { activeElement } = document;
      let at = -1;

      if (activeElement instanceof HTMLElement) {
        at = items.indexOf(activeElement);
      }

      items[(at + step + items.length) % items.length]?.focus();
    },
    []
  );

  return (
    <div
      className="tk-menu"
      role="menu"
      tabIndex={-1}
      aria-label={COPY.labelRawValue}
      ref={list}
      onKeyDown={handleMenuKeyDown}
    >
      <p className="tk-menu-note">{note}</p>
      {snap && <SnapItem cssVar={snap.cssVar} onSnap={onSnap} />}
      {onCreate && <CreateItem onCreate={onCreate} />}
    </div>
  );
};

export { TokenRawMenu };
