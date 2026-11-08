import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ChangeEvent,
  FocusEvent,
  KeyboardEvent,
  ReactNode,
  SyntheticEvent,
} from "react";

import { COPY } from "./copy.js";
import { RENAME_MAX } from "./layers-constants.js";
import { cleanName } from "./layers-tree.js";

interface LayerRenameInputProps {
  readonly initial: string;
  readonly onDone: (value: string | null, next?: 1 | -1) => void;
}

const stopEvent = (event: SyntheticEvent): void => {
  event.stopPropagation();
};

const toTabStep = (isShift: boolean): 1 | -1 => {
  if (isShift) {
    return -1;
  }

  return 1;
};

const runRenameKey = (
  event: KeyboardEvent<HTMLInputElement>,
  value: string,
  finish: (next: string | null, step?: 1 | -1) => void
): void => {
  switch (event.key) {
    case "Enter": {
      finish(value.trim());
      break;
    }

    case "Escape": {
      finish(null);
      break;
    }

    case "Tab": {
      event.preventDefault();
      finish(value.trim(), toTabStep(event.shiftKey));
      break;
    }

    default: {
      break;
    }
  }
};

const selectAll = (event: FocusEvent<HTMLInputElement>): void => {
  event.currentTarget.select();
};

const LayerRenameInput = ({
  initial,
  onDone,
}: LayerRenameInputProps): ReactNode => {
  const [value, setValue] = useState(initial);
  const isDone = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const finish = useCallback(
    (next: string | null, step?: 1 | -1): void => {
      if (isDone.current) {
        return;
      }

      isDone.current = true;
      onDone(next, step);
    },
    [onDone]
  );

  const handleNameChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      setValue(cleanName(event.target.value));
    },
    []
  );

  const handleNameKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>): void => {
      event.stopPropagation();

      runRenameKey(event, value, finish);
    },
    [finish, value]
  );

  const handleNameBlur = useCallback((): void => {
    finish(value.trim());
  }, [finish, value]);

  return (
    <input
      ref={inputRef}
      className="layers-rename"
      aria-label={COPY.labelLayerName}
      placeholder={COPY.placeholderNameThisLayer}
      value={value}
      maxLength={RENAME_MAX}
      spellCheck={false}
      onFocus={selectAll}
      onChange={handleNameChange}
      onPointerDown={stopEvent}
      onDoubleClick={stopEvent}
      onKeyDown={handleNameKeyDown}
      onBlur={handleNameBlur}
    />
  );
};

export { LayerRenameInput };
