import type { Version } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import type { ReactNode } from "react";

import { formatRelative, formatTime } from "../../domain/format.js";
import { COPY } from "./copy.js";
import { authorOf, kindInfo } from "./version-labels.js";
import { VersionLevelBadge } from "./version-level-badge.js";
import { toFileCount, toFileLabel, toFilesTip } from "./version-row-model.js";

const KIND_ICON_SIZE = 12;

interface VersionMetaProps {
  readonly levelText: string | null;
  readonly version: Version;
}

const VersionMeta = ({ levelText, version }: VersionMetaProps): ReactNode => {
  const kind = kindInfo(version);
  const author = authorOf(version);
  const files = toFileCount(version);
  const { level } = version.meta;

  return (
    <div className="version-meta">
      <span
        className={`version-kind ${version.meta.kind}`}
        data-kind={version.meta.kind}
        data-tip={kind.hint}
        data-tip-align="start"
      >
        <Icon name={kind.icon} size={KIND_ICON_SIZE} />
        <span className="version-kind-label">{kind.label}</span>
      </span>
      {level && levelText && (
        <VersionLevelBadge level={level} text={levelText} />
      )}
      <span className="dot" />
      <span
        className="version-author"
        data-author={author}
        data-tip={`${COPY.authorTip}${author}`}
      >
        {author}
      </span>
      <span className="dot" />
      <time
        dateTime={new Date(version.createdAt).toISOString()}
        data-tip={`${formatTime(version.createdAt)} · ${toFileLabel(files)}`}
      >
        {formatRelative(version.createdAt)}
      </time>
      <span className="dot version-file-count-dot" />
      <span className="version-file-count" data-tip={toFilesTip(version)}>
        {toFileLabel(files)}
      </span>
    </div>
  );
};

export { VersionMeta };
