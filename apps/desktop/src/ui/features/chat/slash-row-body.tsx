import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { hasCheckSlot } from "./slash-menu-model.js";
import type { Row } from "./slash-menu-model.js";

const ROW_ICON_SIZE = 16;
const CHECK_ICON_SIZE = 14;

const SlashRowBody = ({ row }: { row: Row }): ReactElement => {
  if (row.kind === "group") {
    return (
      <>
        <Icon name={row.group.icon} size={ROW_ICON_SIZE} />
        <span className="slash-label">{row.group.label}</span>
        <span className="slash-hint">{row.group.value}</span>
        <span className="slash-end slash-chevron" aria-hidden="true">
          {copy.text11}
        </span>
      </>
    );
  }

  const { choice } = row;

  return (
    <>
      {hasCheckSlot(choice) && (
        <span className="slash-check-slot">
          {choice.checked && <Icon name="check" size={CHECK_ICON_SIZE} />}
        </span>
      )}
      <Icon name={choice.icon} size={ROW_ICON_SIZE} />
      <span className="slash-label">{choice.label}</span>
      {choice.hint && <span className="slash-hint">{choice.hint}</span>}
      {choice.tag}
      {choice.meta && (
        <span className="slash-end">
          <span className="slash-meta">{choice.meta}</span>
        </span>
      )}
    </>
  );
};

export { SlashRowBody };
