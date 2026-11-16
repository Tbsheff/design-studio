import type { MentionFrame } from "../../shared/server-ports.js";

const FRAME_TAG = "mentioned-frames";

const toFramePageText = (frame: MentionFrame): string => {
  if (frame.path === "") {
    return "(entry page)";
  }

  return `/${frame.path}`;
};

const toFrameMentionLine = (frame: MentionFrame): string => {
  const name = frame.label ?? toFramePageText(frame);

  return `${name}: page ${toFramePageText(frame)}, state ${frame.state}, ${frame.width}x${frame.height}, frameId ${frame.id}`;
};

const toFrameMentionBlock = (
  frames: readonly MentionFrame[]
): string | null => {
  if (frames.length === 0) {
    return null;
  }

  const lines = frames.map((frame) => toFrameMentionLine(frame)).join("\n");

  return `<${FRAME_TAG}>\nThe user pointed at these canvas frames. Call get_screenshot with frameId to see it.\n${lines}\n</${FRAME_TAG}>`;
};

export { toFrameMentionBlock };
