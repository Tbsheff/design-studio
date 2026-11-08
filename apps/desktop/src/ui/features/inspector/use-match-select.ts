import type {
  StyleQuery,
  StyleValueRow,
} from "@design-studio/contracts/style-search";
import type { MutableRefObject } from "react";

import type { PreviewPort } from "../../platform/bridge.js";
import { toSelectedText } from "./match-model.js";
import { requestStyles } from "./match-scan.js";
import type { Status } from "./match-scan.js";

const FRAME_SILENT = "The frame did not answer. Reload it and try again.";

const useMatchSelect =
  (
    port: MutableRefObject<PreviewPort | null>,
    setStatus: (status: Status) => void
  ): ((row: StyleValueRow, extra: StyleQuery) => Promise<void>) =>
  async (row: StyleValueRow, extra: StyleQuery): Promise<void> => {
    setStatus({ kind: "busy", text: "Finding matches…" });

    const reply = await requestStyles(
      port.current,
      { property: row.kind, ...extra },
      true
    );

    if (reply) {
      setStatus({
        kind: "done",
        text: toSelectedText(reply.selected, reply.result.elements),
      });
    } else {
      setStatus({ kind: "error", text: FRAME_SILENT });
    }
  };

export { useMatchSelect };
