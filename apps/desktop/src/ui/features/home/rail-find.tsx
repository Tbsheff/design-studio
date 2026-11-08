import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type {
  ChangeEvent,
  KeyboardEvent,
  ReactElement,
  RefObject,
} from "react";

import { copy } from "./copy.js";
import type { ProjectHit } from "./deps.js";
import { runPickProject } from "./rail-store-model.js";

const FIND_ICON_SIZE = 12;

interface RailFindProps {
  readonly find: RefObject<HTMLInputElement | null>;
  readonly filter: string;
  readonly first: ProjectHit | null;
  readonly onFilter: (filter: string) => void;
}

const RailFind = ({
  find,
  filter,
  first,
  onFilter,
}: RailFindProps): ReactElement => {
  const change = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      onFilter(event.target.value);
    },
    [onFilter]
  );

  const keyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>): void => {
      if (event.key === "Enter" && first && !event.nativeEvent.isComposing) {
        runPickProject(first.id);

        return;
      }

      if (event.key === "Escape" && filter) {
        event.preventDefault();
        event.stopPropagation();
        onFilter("");
      }
    },
    [filter, first, onFilter]
  );

  return (
    <div className="prail-find">
      <Icon name="search" size={FIND_ICON_SIZE} />
      <input
        ref={find}
        name="find"
        value={filter}
        placeholder={copy.find}
        aria-label={copy.findAProject}
        spellCheck={false}
        onChange={change}
        onKeyDown={keyDown}
      />
    </div>
  );
};

export { RailFind };
