import type { StyleValueRow } from "@design-studio/contracts/style-search";
import type { ReactElement } from "react";

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
}: {
  readonly row: StyleValueRow;
}): ReactElement | null => {
  if (row.state === "raw") {
    return null;
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
