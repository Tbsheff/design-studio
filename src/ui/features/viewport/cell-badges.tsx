import { useMemo } from "react";
import type { ReactElement } from "react";
import { createPortal } from "react-dom";

import { copy } from "./copy.js";
import { countByFrame } from "./matrix-model.js";
import type { MatrixFindingView } from "./matrix-model.js";

import styles from "./viewport.module.css";

interface CellBadgesProps {
  readonly findings: readonly MatrixFindingView[];
}

interface BadgeHost {
  readonly count: number;
  readonly element: Element;
  readonly frameId: string;
}

const hostsOf = (findings: readonly MatrixFindingView[]): BadgeHost[] => {
  const hosts: BadgeHost[] = [];

  for (const [frameId, count] of countByFrame(findings)) {
    const element = document.querySelector(
      `.frame-label[data-frame-id="${CSS.escape(frameId)}"]`
    );

    if (element !== null) {
      hosts.push({ count, element, frameId });
    }
  }

  return hosts;
};

const CellBadges = ({ findings }: CellBadgesProps): ReactElement => {
  const hosts = useMemo(() => hostsOf(findings), [findings]);

  return (
    <>
      {hosts.map((host) =>
        createPortal(
          <span className={styles.badge} data-tip={copy.badge}>
            {host.count}
          </span>,
          host.element,
          host.frameId
        )
      )}
    </>
  );
};

export { CellBadges };
