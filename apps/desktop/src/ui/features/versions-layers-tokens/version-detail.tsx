import type { Version } from "@design-studio/contracts";
import type { ReactNode } from "react";

import { formatTime } from "../../domain/format.js";
import { COPY } from "./copy.js";
import { VersionDetailFiles } from "./version-detail-files.js";
import { fullText, originOf, undoneOf } from "./version-labels.js";
import type { VersionIndex } from "./version-labels.js";
import { VersionLink } from "./version-link.js";

interface VersionDetailProps {
  readonly id: string;
  readonly index: VersionIndex;
  readonly onOpenVersion: (version: Version) => void;
  readonly version: Version;
}

const toPromptLabel = (version: Version): string => {
  if (version.meta.kind === "run") {
    return COPY.detailPrompt;
  }

  return COPY.detailChange;
};

const toOriginLabel = (version: Version): string => {
  if (version.meta.kind === "undo") {
    return COPY.detailBackTo;
  }

  return COPY.detailRestored;
};

const VersionDetail = ({
  id,
  index,
  onOpenVersion,
  version,
}: VersionDetailProps): ReactNode => {
  const prompt = fullText(version);
  const origin = originOf(version, index);
  const undone = undoneOf(version, index);

  return (
    <dl className="version-detail" id={id}>
      {prompt && (
        <div className="version-fact">
          <dt>{toPromptLabel(version)}</dt>
          <dd className="version-prompt">{prompt}</dd>
        </div>
      )}
      {undone && (
        <VersionLink
          label={COPY.detailUndid}
          target={undone}
          index={index}
          onOpen={onOpenVersion}
        />
      )}
      {origin && (
        <VersionLink
          label={toOriginLabel(version)}
          target={origin}
          index={index}
          onOpen={onOpenVersion}
        />
      )}
      <div className="version-fact">
        <dt>{COPY.detailSaved}</dt>
        <dd>{formatTime(version.createdAt)}</dd>
      </div>
      <VersionDetailFiles version={version} />
    </dl>
  );
};

export { VersionDetail };
