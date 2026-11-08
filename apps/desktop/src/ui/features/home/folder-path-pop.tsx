import { useCallback, useState } from "react";
import type {
  ChangeEvent,
  KeyboardEvent,
  ReactElement,
  RefObject,
} from "react";

import { copy } from "./copy.js";
import { Pop } from "./home-popovers.js";

interface FolderPathPopProps {
  readonly trigger: RefObject<HTMLElement | null>;
  readonly isClosing: boolean;
  readonly onClose: (shouldRefocus: boolean) => void;
  readonly onPick: (path: string) => void;
}

const FolderPathPop = ({
  trigger,
  isClosing,
  onClose,
  onPick,
}: FolderPathPopProps): ReactElement => {
  const [value, setValue] = useState("");

  const submit = useCallback((): void => {
    if (!value.trim()) {
      return;
    }

    onPick(value.trim());
    onClose(true);
  }, [onClose, onPick, value]);

  const keyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>): void => {
      if (event.key === "Enter") {
        event.preventDefault();
        submit();
      }
    },
    [submit]
  );

  const change = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
    setValue(event.target.value);
  }, []);

  return (
    <Pop
      trigger={trigger}
      closing={isClosing}
      onClose={onClose}
      variant="ui-menu home-path-pop"
      label={copy.addAppFolderLabel}
    >
      <div className="ui-menu-section">
        <label className="ui-menu-label" htmlFor="home-app-path">
          {copy.folderPath}
        </label>
        <input
          id="home-app-path"
          name="path"
          className="mono"
          value={value}
          placeholder={copy.codeMyApp}
          spellCheck={false}
          autoComplete="off"
          onKeyDown={keyDown}
          onChange={change}
        />
        <p className="home-app-note">{copy.theDesktopAppOpensThe}</p>
        <button
          type="button"
          className="btn small primary"
          disabled={!value.trim()}
          onClick={submit}
        >
          {copy.addFolder2}
        </button>
      </div>
    </Pop>
  );
};

export { FolderPathPop };

export type { FolderPathPopProps };
