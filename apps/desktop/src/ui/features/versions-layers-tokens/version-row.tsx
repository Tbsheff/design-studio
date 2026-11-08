import type { ReactNode } from "react";

import { levelLabel } from "../chat/level-control.js";
import { VersionDetail } from "./version-detail.js";
import { displayTitle } from "./version-labels.js";
import { VersionLine } from "./version-line.js";
import { toRowClass } from "./version-row-model.js";
import type { VersionRowProps } from "./version-row-types.js";
import { VersionThumb } from "./version-thumb.js";
import { VersionTitle } from "./version-title.js";

const DETAIL_ID_LENGTH = 12;

const toLevelText = (
  level: VersionRowProps["version"]["meta"]["level"]
): string | null => {
  if (level) {
    return levelLabel(level);
  }

  return null;
};

const VersionRow = (props: VersionRowProps): ReactNode => {
  const { version } = props;
  const title = displayTitle(version, props.index);
  const detailId = `version-detail-${version.id.slice(0, DETAIL_ID_LENGTH)}`;
  const levelText = toLevelText(version.meta.level);
  const compareSide = props.compareSide ?? null;

  return (
    <li className={toRowClass(props)}>
      <span className="version-node" aria-hidden="true" />
      <VersionThumb
        projectId={props.projectId}
        versionId={version.id}
        active={props.active}
        label={title}
        onOpen={props.onOpen}
      />
      <div className="version-main">
        <VersionTitle
          compareSide={compareSide}
          detailId={detailId}
          index={props.index}
          isExpanded={props.expanded}
          isHead={props.isHead}
          title={title}
          version={version}
          onExpand={props.onExpand}
          onRename={props.onRename}
        />
        <VersionLine levelText={levelText} props={props} title={title} />
        {props.expanded && (
          <VersionDetail
            version={version}
            index={props.index}
            id={detailId}
            onOpenVersion={props.onOpenVersion}
          />
        )}
      </div>
    </li>
  );
};

export { VersionRow };
