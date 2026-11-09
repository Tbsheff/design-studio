import type { ReactElement } from "react";
import { useMemo } from "react";

import { CommentLayer } from "./comment-layer.js";
import type { PlayCommentInput, SelectionContext } from "./deps.js";
import { usePlayComments } from "./use-play-comments.js";

const NO_SELECTION: SelectionContext[] = [];

const PlayCommentLayer = (props: PlayCommentInput): ReactElement => {
  const { control, frames } = usePlayComments(props);
  const { frame, frames: allFrames, height, onExit, width } = props;

  const size = useMemo(() => ({ height, width }), [height, width]);

  const activeFrame = useMemo(
    () => ({
      id: frame.id,
      ids: allFrames.map((item) => item.id),
      path: frame.path ?? "",
    }),
    [allFrames, frame.id, frame.path]
  );

  return (
    <div className="play-comment-layer" data-testid="play-comment-layer">
      <CommentLayer
        control={control}
        frames={frames}
        kind={props.kind}
        zoom={props.scale}
        frame={size}
        commentMode={props.isOn}
        selectMode={false}
        selection={NO_SELECTION}
        onExitCommentMode={onExit}
        tools={props.tools}
        activeFrame={activeFrame}
      />
    </div>
  );
};

export { PlayCommentLayer };
