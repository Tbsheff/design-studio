import type { DirectStyleProperty } from "@design-studio/contracts";
import { useCallback, useState } from "react";
import type { ChangeEvent, ReactElement } from "react";

import { toPlaceholder } from "./field-model.js";
import { UNSAFE, toCommittedValue, toShownValue } from "./rows-model.js";
import type { DirectEdit } from "./use-direct-edit.js";
import { useRowKeys } from "./use-row-keys.js";

interface CssTextRowProps {
  readonly prop: DirectStyleProperty;
  readonly label: string;
  readonly short: string;
  readonly edit: DirectEdit;
  readonly placeholder: string;
}

const CssTextRow = ({
  prop,
  label,
  short,
  edit,
  placeholder,
}: CssTextRowProps): ReactElement => {
  const [text, setText] = useState<string | null>(null);
  const id = `ins-${prop}`;

  const handleCommit = useCallback((): void => {
    if (text !== null) {
      const next = text.trim();

      if (UNSAFE.test(next)) {
        edit.revert([prop]);
      } else {
        edit.preview({ [prop]: toCommittedValue(next) });
      }
    }

    setText(null);
    edit.commit();
  }, [text, edit, prop]);

  const handleRevert = useCallback((): void => {
    setText(null);
    edit.revert([prop]);
  }, [edit, prop]);

  const handleKeyDown = useRowKeys(handleCommit, handleRevert);

  const handleTextChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      setText(event.target.value);
      const next = event.target.value.trim();

      if (next !== "" && !UNSAFE.test(next)) {
        edit.preview({ [prop]: next });
      }
    },
    [edit, prop]
  );

  return (
    <div className="ins-field wide">
      <label htmlFor={id} className="ins-scrub static">
        {short}
      </label>
      <input
        id={id}
        className="ins-input mono"
        aria-label={label}
        value={toShownValue(text, edit.values[prop])}
        spellCheck={false}
        autoComplete="off"
        placeholder={toPlaceholder(edit.mixed.has(prop), placeholder)}
        onChange={handleTextChange}
        onKeyDown={handleKeyDown}
        onBlur={handleCommit}
      />
    </div>
  );
};

export { CssTextRow };
