import { useCallback, useMemo } from "react";

import {
  FORMAT_GROUPS,
  toFormatGroup,
  toMemberChoices,
} from "./export-formats.js";
import type {
  DialogFormat,
  FormatChoice,
  FormatGroupId,
} from "./export-formats.js";
import type { ExportOptions } from "./use-export-options.js";

interface ExportGroup {
  readonly groupId: FormatGroupId;
  readonly handleFormat: (next: DialogFormat) => void;
  readonly handleGroup: (next: FormatGroupId) => void;
  readonly memberChoices: readonly FormatChoice<DialogFormat>[];
}

const useExportGroup = (
  options: ExportOptions,
  resetStatus: () => void
): ExportGroup => {
  const { format } = options;
  const group = toFormatGroup(format);
  const memberChoices = useMemo(() => toMemberChoices(group), [group]);

  const handleFormat = useCallback(
    (next: DialogFormat): void => {
      options.onChoose(next);
      resetStatus();
    },
    [options, resetStatus]
  );

  const handleGroup = useCallback(
    (next: FormatGroupId): void => {
      const members =
        FORMAT_GROUPS.find((entry) => entry.id === next)?.members ?? [];

      const [first] = members;

      if (!members.includes(format) && first) {
        handleFormat(first);
      }
    },
    [format, handleFormat]
  );

  return { groupId: group.id, handleFormat, handleGroup, memberChoices };
};

export { useExportGroup };

export type { ExportGroup };
