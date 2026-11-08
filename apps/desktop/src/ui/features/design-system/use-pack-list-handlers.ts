import type { PackSummary } from "@design-studio/contracts";
import type { KeyboardEvent, MouseEvent, RefObject } from "react";
import { useCallback } from "react";

import { toColumns, toKeyAction, toOptionIndex } from "./pack-list-model.js";

interface PackListHandlers {
  readonly onClick: (event: MouseEvent) => void;
  readonly onHover: (event: MouseEvent) => void;
  readonly onKey: (event: KeyboardEvent) => void;
}

const usePackListHandlers = ({
  active,
  list,
  onChoose,
  onTab,
  options,
  setActive,
}: {
  active: number;
  list: RefObject<HTMLDivElement | null>;
  onChoose: (pack: PackSummary | null) => void;
  onTab: (() => void) | null;
  options: (PackSummary | null)[];
  setActive: (index: number) => void;
}): PackListHandlers => {
  const onKey = useCallback(
    (event: KeyboardEvent): void => {
      const action = toKeyAction(
        event.key,
        active,
        options.length,
        toColumns(list.current)
      );

      if (action?.kind === "tab") {
        onTab?.();

        return;
      }

      if (!action) {
        return;
      }

      event.preventDefault();

      if (action.kind === "move") {
        setActive(action.index);

        return;
      }

      if (options.length > 0) {
        onChoose(options[active] ?? null);
      }
    },
    [active, list, onChoose, onTab, options, setActive]
  );

  const onClick = useCallback(
    (event: MouseEvent): void => {
      const index = toOptionIndex(event.target);

      if (index !== null) {
        onChoose(options[index] ?? null);
      }
    },
    [onChoose, options]
  );

  const onHover = useCallback(
    (event: MouseEvent): void => {
      const index = toOptionIndex(event.target);

      if (index !== null) {
        setActive(index);
      }
    },
    [setActive]
  );

  return { onClick, onHover, onKey };
};

export { usePackListHandlers };

export type { PackListHandlers };
