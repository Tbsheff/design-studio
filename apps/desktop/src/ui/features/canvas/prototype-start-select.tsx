import type { LinksFile } from "@design-studio/contracts/links";
import { Icon, UiSelect } from "@design-studio/ui";
import { useCallback, useMemo } from "react";
import type { ReactElement } from "react";

import type { CanvasFrame } from "./canvas-frames-model.js";
import { copy } from "./copy.js";
import { linksApi } from "./links-api.js";
import { protoCopy } from "./proto-copy.js";
import { ProtoSlot } from "./proto-slot.js";
import { playStartOf } from "./prototype-model.js";
import { useLinkRunner } from "./use-link-runner.js";

const START_ICON = 12;

const START_ICON_NODE = <Icon name="play" size={START_ICON} />;

interface PrototypeStartSelectProps {
  readonly projectId: string;
  readonly file: LinksFile;
  readonly frames: CanvasFrame[];
  readonly startId: string;
  readonly toTitle: (frame: CanvasFrame) => string;
  readonly onError: (message: string) => void;
}

const PrototypeStartSelect = ({
  projectId,
  file,
  frames,
  startId,
  toTitle,
  onError,
}: PrototypeStartSelectProps): ReactElement => {
  const run = useLinkRunner(onError);

  const options = useMemo(
    () => frames.map((frame) => ({ label: toTitle(frame), value: frame.id })),
    [frames, toTitle]
  );

  const handleStart = useCallback(
    (value: string): void => run(() => linksApi.setStart(projectId, value)),
    [projectId, run]
  );

  return (
    <ProtoSlot isNarrow={false}>
      <UiSelect
        aria-label={copy.startFrame}
        tip={protoCopy.startTip}
        icon={START_ICON_NODE}
        value={playStartOf(file, frames, startId)}
        options={options}
        onChange={handleStart}
      />
    </ProtoSlot>
  );
};

export { PrototypeStartSelect };
