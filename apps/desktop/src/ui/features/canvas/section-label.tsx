import type { CanvasSection } from "@design-studio/contracts/canvas-file";
import { Icon } from "@design-studio/ui";
import { useCallback, useMemo, useState } from "react";
import type { CSSProperties, KeyboardEvent, ReactElement } from "react";

import { sectionCopy } from "./section-copy.js";
import { SectionNameInput } from "./section-name-input.js";
import type { SectionHandlers } from "./use-section-handlers.js";

interface SectionLabelProps {
  readonly handlers: SectionHandlers;
  readonly offset: { readonly x: number; readonly y: number };
  readonly section: CanvasSection;
}

const stopPointer = (event: { stopPropagation: () => void }): void =>
  event.stopPropagation();

const SectionLabel = ({
  handlers,
  offset,
  section,
}: SectionLabelProps): ReactElement => {
  const [isRenaming, setIsRenaming] = useState(false);
  const { remove, rename, startMove } = handlers;

  const style = useMemo(
    (): CSSProperties => ({
      left: section.x - offset.x,
      top: section.y - offset.y,
    }),
    [section.x, section.y, offset.x, offset.y]
  );

  const beginRename = useCallback((): void => setIsRenaming(true), []);

  const finishRename = useCallback(
    (raw: string | null): void => {
      setIsRenaming(false);

      if (raw !== null) {
        rename(raw);
      }
    },
    [rename]
  );

  const onNameKey = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>): void => {
      if (event.key === "Enter" || event.key === "F2") {
        setIsRenaming(true);
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        remove();
      }
    },
    [remove]
  );

  return (
    <div
      className="canvas-section-label"
      data-section-label={section.id}
      style={style}
      onPointerDown={stopPointer}
    >
      {isRenaming && (
        <SectionNameInput label={section.label} onDone={finishRename} />
      )}
      {!isRenaming && (
        <button
          type="button"
          className="canvas-section-name"
          data-tip={sectionCopy.renameSection}
          onPointerDown={startMove}
          onDoubleClick={beginRename}
          onKeyDown={onNameKey}
        >
          {section.label}
        </button>
      )}
      <button
        type="button"
        className="canvas-section-remove"
        aria-label={sectionCopy.deleteSection}
        data-tip={sectionCopy.deleteSection}
        onClick={remove}
      >
        <Icon name="close" size={12} />
      </button>
    </div>
  );
};

export { SectionLabel };
