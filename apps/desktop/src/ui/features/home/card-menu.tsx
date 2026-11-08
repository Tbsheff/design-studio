import type { Project } from "@design-studio/contracts";
import { useCallback, useMemo } from "react";
import type { MouseEvent, ReactElement } from "react";

import { CardMenuItem } from "./card-menu-item.js";
import { toMenuEntries, toMenuMode, toMenuStyle } from "./card-menu-model.js";
import { copy } from "./copy.js";
import type { CardAction, MenuAt } from "./project-card-model.js";
import { useCardMenuFocus } from "./use-card-menu-focus.js";

interface CardMenuProps {
  readonly project: Project;
  readonly place: string | null;
  readonly at: Exclude<MenuAt, null>;
  readonly onClose: (shouldRefocus: boolean) => void;
  readonly onPick: (action: CardAction) => void;
}

const CardMenu = ({
  project,
  place,
  at,
  onClose,
  onPick,
}: CardMenuProps): ReactElement => {
  const { rootRef, registerItem, onKeyDown } = useCardMenuFocus(onClose);
  const style = useMemo(() => toMenuStyle(at), [at]);
  const entries = useMemo(() => toMenuEntries(place), [place]);

  const blockContext = useCallback(
    (event: MouseEvent<HTMLDivElement>): void => {
      event.preventDefault();
    },
    []
  );

  return (
    <div
      ref={rootRef}
      className={`project-menu${toMenuMode(at)}`}
      role="menu"
      tabIndex={-1}
      aria-label={`Actions for ${project.name}`}
      style={style}
      onKeyDown={onKeyDown}
      onContextMenu={blockContext}
    >
      {entries.safe.map((entry) => (
        <CardMenuItem
          key={entry.action}
          entry={entry}
          register={registerItem}
          onPick={onPick}
        />
      ))}
      <hr className="project-menu-sep" />
      {entries.danger.map((entry) => (
        <CardMenuItem
          key={entry.action}
          entry={entry}
          register={registerItem}
          onPick={onPick}
        />
      ))}
      {place && (
        <p className="project-menu-note">
          {copy.filesStayIn}
          {place}
          {copy.text}
        </p>
      )}
    </div>
  );
};

export { CardMenu };

export type { CardMenuProps };
