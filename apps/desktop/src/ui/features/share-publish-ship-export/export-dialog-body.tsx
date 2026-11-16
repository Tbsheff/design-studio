import type {
  EditorInfo,
  HandoffResult,
} from "@design-studio/contracts/export";
import type { ReactElement } from "react";

import { ConnectAiOpener } from "./connect-ai-opener.js";
import { copy as uiCopy } from "./copy.js";
import type { ExportTarget } from "./export-api.js";
import type {
  DialogFormat,
  ExportStatus,
  FormatGroupId,
  FormatInfo,
} from "./export-formats.js";
import { ExportOptionFields } from "./export-option-fields.js";
import type { FrameLabel } from "./frame-label.js";
import { HandoffResultView } from "./handoff-result-view.js";
import { Segmented } from "./segmented.js";
import type { SegmentOption } from "./segmented.js";
import type { ExportOptions } from "./use-export-options.js";

interface ExportDialogBodyProps {
  readonly target: ExportTarget;
  readonly options: ExportOptions;
  readonly labels: ReadonlyMap<string, FrameLabel>;
  readonly info: FormatInfo;
  readonly groupId: FormatGroupId;
  readonly groupOptions: readonly SegmentOption<FormatGroupId>[];
  readonly memberOptions: readonly SegmentOption<DialogFormat>[];
  readonly status: ExportStatus;
  readonly isBusy: boolean;
  readonly result: HandoffResult | null;
  readonly editors: readonly EditorInfo[];
  readonly onFormat: (format: DialogFormat) => void;
  readonly onGroup: (group: FormatGroupId) => void;
  readonly onError: (text: string) => void;
}

const ExportDialogBody = ({
  editors,
  groupId,
  groupOptions,
  info,
  isBusy,
  labels,
  memberOptions,
  onError,
  onFormat,
  onGroup,
  options,
  result,
  status,
  target,
}: ExportDialogBodyProps): ReactElement => (
  <div className="modal-body export-body" aria-busy={isBusy}>
    <Segmented
      label={uiCopy.formatLabel}
      value={groupId}
      options={groupOptions}
      onChange={onGroup}
    />
    {memberOptions.length > 1 && (
      <Segmented
        label={uiCopy.formatKindLabel}
        value={options.format}
        options={memberOptions}
        onChange={onFormat}
      />
    )}
    <p className="export-sub export-hint">{info.hint}</p>
    <ExportOptionFields options={options} labels={labels} />
    {result && (
      <HandoffResultView
        target={target}
        result={result}
        editors={editors}
        onError={onError}
      />
    )}
    {options.format === "handoff" && <ConnectAiOpener />}
    {status.kind === "error" && (
      <div className="alert error small" role="alert">
        {status.text}
      </div>
    )}
  </div>
);

export { ExportDialogBody };
