import { useCallback, useEffect, useRef } from "react";
import type { KeyboardEvent, ReactElement } from "react";

import { CopyCodeItemButton } from "./copy-code-item-button.js";
import { copy } from "./copy.js";
import type { CopyCodeItem } from "./use-copy-code-items.js";

interface Props {
  readonly items: readonly CopyCodeItem[];
  readonly onClose: (refocus: boolean) => void;
}

const toKeyStep = (key: string): number => {
  if (key === "ArrowDown") {
    return 1;
  }

  if (key === "ArrowUp") {
    return -1;
  }

  return 0;
};

const CopyCodeMenuList = ({ items, onClose }: Props): ReactElement => {
  const nodes = useRef<(HTMLButtonElement | null)[]>([]);

  const handleRegister = useCallback(
    (index: number, node: HTMLButtonElement | null): void => {
      nodes.current[index] = node;
    },
    []
  );

  useEffect(() => {
    nodes.current[0]?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>): void => {
      if (event.key === "Tab") {
        onClose(false);
      }

      const step = toKeyStep(event.key);

      if (step === 0) {
        return;
      }

      event.preventDefault();

      const current = nodes.current.indexOf(
        document.activeElement as HTMLButtonElement
      );

      const count = nodes.current.length;
      nodes.current[(Math.max(0, current) + step + count) % count]?.focus();
    },
    [onClose]
  );

  return (
    <div
      className="project-menu copy-code-menu"
      role="menu"
      tabIndex={-1}
      aria-label={copy.copyElement}
      onKeyDown={handleKeyDown}
    >
      {items.map((item, index) => (
        <CopyCodeItemButton
          key={item.label}
          index={index}
          item={item}
          onRegister={handleRegister}
        />
      ))}
    </div>
  );
};

export { CopyCodeMenuList };
