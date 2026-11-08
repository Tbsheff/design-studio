import type { StyleValueRow } from "@design-studio/contracts/style-search";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { toShownValue } from "./match-candidates-model.js";

const RAW_TAG_STYLE = { border: 0, cursor: "pointer" };

const MIXED_TIP = "Some elements use a token, some a raw value";

const toStateClass = (state: StyleValueRow["state"]): string => {
  if (state === "mixed") {
    return "sm-tag mixed";
  }

  return "sm-tag token";
};

const toStateTip = (row: StyleValueRow): string => {
  if (row.state === "mixed") {
    return MIXED_TIP;
  }

  return `Token ${row.tokens.join(", ")}`;
};

const toMoreText = (count: number): string => {
  if (count > 1) {
    return ` +${count - 1}`;
  }

  return "";
};

const StateTag = ({
  row,
  onReplace,
}: {
  readonly row: StyleValueRow;
  readonly onReplace: () => void;
}): ReactElement => {
  if (row.state === "raw") {
    return (
      <button
        type="button"
        className="sm-tag raw"
        style={RAW_TAG_STYLE}
        aria-label={`Replace ${toShownValue(row)} with a token`}
        data-tip={copy.notATokenReplaceIt}
        onClick={onReplace}
      >
        {copy.raw}
      </button>
    );
  }

  if (row.state === "palette") {
    return (
      <span
        className="sm-tag mixed"
        data-tip={`Tailwind palette class ${row.tokens.join(", ")}, not a project token`}
      >
        {row.tokens[0] ?? "palette"}
      </span>
    );
  }

  return (
    <span className={toStateClass(row.state)} data-tip={toStateTip(row)}>
      {row.tokens[0] ?? ""}
      {toMoreText(row.tokens.length)}
    </span>
  );
};

export { StateTag };
