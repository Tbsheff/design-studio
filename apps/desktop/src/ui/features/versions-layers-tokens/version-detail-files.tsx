import type { Version } from "@design-studio/contracts";
import type { ReactNode } from "react";

import { COPY } from "./copy.js";
import { toFileCount } from "./version-row-model.js";

interface VersionDetailFilesProps {
  readonly version: Version;
}

const VersionDetailFiles = ({
  version,
}: VersionDetailFilesProps): ReactNode => {
  const more = toFileCount(version) - version.changedFiles.length;

  if (version.changedFiles.length === 0) {
    return null;
  }

  return (
    <div className="version-fact">
      <dt>{COPY.detailFiles}</dt>
      <dd className="version-files">
        {version.changedFiles.map((file) => (
          <code key={file}>{file}</code>
        ))}
        {more > 0 && (
          <span>{`${COPY.andPrefix}${more}${COPY.andMoreFiles}`}</span>
        )}
      </dd>
    </div>
  );
};

export { VersionDetailFiles };
