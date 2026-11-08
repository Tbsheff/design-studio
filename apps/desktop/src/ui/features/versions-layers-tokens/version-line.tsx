import type { ReactNode } from "react";

import { VersionActions } from "./version-actions.js";
import { VersionMeta } from "./version-meta.js";
import { toMoreItems } from "./version-row-model.js";
import type { VersionRowProps } from "./version-row-types.js";
import { openCompareInCode } from "./versions-api.js";

interface VersionLineProps {
  readonly levelText: string | null;
  readonly props: VersionRowProps;
  readonly title: string;
}

const VersionLine = ({
  levelText,
  props,
  title,
}: VersionLineProps): ReactNode => (
  <div className="version-line">
    <VersionMeta levelText={levelText} version={props.version} />
    <VersionActions
      items={toMoreItems(props, openCompareInCode)}
      props={props}
      title={title}
    />
  </div>
);

export { VersionLine };
