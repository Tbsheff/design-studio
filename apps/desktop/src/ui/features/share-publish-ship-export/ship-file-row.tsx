import type { ShipFile } from "@design-studio/contracts/ship";
import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { pick } from "./pick.js";
import { ShipCounts } from "./ship-counts.js";
import { STATUS_LETTER, shippable } from "./ship-model.js";

interface ShipFileRowProps {
  readonly file: ShipFile;
  readonly isActive: boolean;
  readonly isChecked: boolean;
  readonly onFocus: (path: string) => void;
  readonly onToggle: (path: string) => void;
}

const ShipFileRow = ({
  file,
  isActive,
  isChecked,
  onFocus,
  onToggle,
}: ShipFileRowProps): ReactElement => {
  const toggleFile = useCallback((): void => {
    onToggle(file.path);
  }, [file.path, onToggle]);

  const focusFile = useCallback((): void => {
    onFocus(file.path);
  }, [file.path, onFocus]);

  return (
    <li className={pick(isActive, "active", "")}>
      <input
        type="checkbox"
        aria-label={`Ship ${file.path}`}
        checked={isChecked}
        disabled={!shippable(file)}
        onChange={toggleFile}
      />
      <button
        type="button"
        className="ship-file"
        onClick={focusFile}
        data-tip={file.refused ?? file.conflict ?? file.path}
      >
        <span className={`ship-status ${file.status}`}>
          {STATUS_LETTER[file.status]}
        </span>
        <span className="mono truncate">{file.path}</span>
        {(file.refused || file.conflict) && <Icon name="alert" size={12} />}
        <ShipCounts file={file} />
      </button>
    </li>
  );
};

export { ShipFileRow };
