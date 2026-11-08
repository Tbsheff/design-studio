import { PanelHead } from "@design-studio/ui";
import { createElement } from "react";
import type { ReactNode } from "react";

import { COPY } from "./copy.js";
import { VersionsHeadActions } from "./versions-head-actions.js";

interface VersionsHeadProps {
  readonly canUndo: boolean;
  readonly comparing: boolean;
  readonly count: number;
  readonly onCompare: () => void;
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
      canUndo: props.canUndo,
      comparing: props.comparing,
      onCompare: props.onCompare,
      onUndo: props.onUndo,
    })
  );

export { toVersionsHead };
