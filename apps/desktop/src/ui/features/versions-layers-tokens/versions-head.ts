import { PanelHead } from "@design-studio/ui";
import { createElement } from "react";
import type { ReactNode } from "react";

import { COPY } from "./copy.js";
import { VersionsHeadActions } from "./versions-head-actions.js";

interface VersionsHeadProps {
  readonly canNewDirection: boolean;
  readonly canUndo: boolean;
  readonly comparing: boolean;
  readonly count: number;
  readonly hasMenu: boolean;
  readonly onCompare: () => void;
  readonly onNewDirection: () => void;
  readonly onUndo: () => void;
}

const toVersionsHead = (props: VersionsHeadProps): ReactNode =>
  createElement(
    PanelHead,
    {
      headClass: "section-head",
      title: COPY.titleVersions,
      titleClassName: "section-title",
    },
    createElement("span", { className: "count" }, props.count),
    createElement(VersionsHeadActions, {
      canNewDirection: props.canNewDirection,
      canUndo: props.canUndo,
      comparing: props.comparing,
      hasMenu: props.hasMenu,
      onCompare: props.onCompare,
      onNewDirection: props.onNewDirection,
      onUndo: props.onUndo,
    })
  );

export { toVersionsHead };
