import type { ReactElement, ReactNode } from "react";

import { copy } from "./copy.js";
import { ShareBody } from "./share-body.js";
import type { SharePlayInput } from "./share-viewer-model.js";
import { useSharePlay } from "./use-share-play.js";

interface ShareViewerProps {
  readonly renderPlay: (input: SharePlayInput) => ReactNode;
}

const ShareViewer = ({ renderPlay }: ShareViewerProps): ReactElement => {
  const { data, isMissing } = useSharePlay();

  if (isMissing) {
    return <p className="share-empty">{copy.ended}</p>;
  }

  if (data === null) {
    return <p className="share-empty">{copy.loading}</p>;
  }

  return <ShareBody data={data} renderPlay={renderPlay} />;
};

export { ShareViewer };

export type { ShareViewerProps };
