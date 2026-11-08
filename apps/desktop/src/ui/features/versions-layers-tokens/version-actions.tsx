import type { ReactNode } from "react";

import { COPY } from "./copy.js";
import { VersionMoreMenu } from "./version-more-menu.js";
import { VersionRowAction } from "./version-row-action.js";
import type { MoreItem, VersionRowProps } from "./version-row-types.js";

const GROUP_ROLE = "group";

interface VersionActionsProps {
  readonly items: MoreItem[];
  readonly props: VersionRowProps;
  readonly title: string;
}

const VersionActions = ({
  items,
  props,
  title,
}: VersionActionsProps): ReactNode => {
  const { isHead, picked } = props;
  let restoreTip: string = COPY.tipRestoreAsHead;
  let compareLabel: string = COPY.actionCompare;
  let compareTip: string = COPY.tipAddToCompare;

  if (isHead) {
    restoreTip = COPY.tipAlreadyHead;
  }

  if (picked) {
    compareLabel = COPY.actionComparing;
    compareTip = COPY.tipRemoveFromCompare;
  }

  return (
    <div
      className="version-actions"
      role={GROUP_ROLE}
      aria-label={COPY.labelVersionActions}
    >
      <VersionRowAction
        label={COPY.actionOpen}
        icon="eye"
        tip={COPY.tipOpenVersion}
        onClick={props.onOpen}
      />
      <VersionRowAction
        label={COPY.actionRestore}
        icon="restore"
        tip={restoreTip}
        disabled={isHead || props.locked}
        onClick={props.onRestore}
      />
      <VersionRowAction
        label={compareLabel}
        icon="compare"
        tip={compareTip}
        pressed={picked}
        onClick={props.onToggleCompare}
      />
      <VersionMoreMenu items={items} title={title} />
    </div>
  );
};

export { VersionActions };
