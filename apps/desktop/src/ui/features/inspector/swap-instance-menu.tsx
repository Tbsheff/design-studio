import type { SourceLoc } from "@design-studio/contracts";
import { useFitPopover, usePopover } from "@design-studio/ui";
import type { ReactElement } from "react";
import { useCallback, useMemo, useRef } from "react";

import {
  apiMessage,
  componentCreateApi,
} from "../design-system/component-create-api.js";
import { copy } from "./copy.js";
import { SwapCandidateRow } from "./swap-candidate-row.js";
import { toCandidateKey, toDroppedText, toSwapLabel } from "./swap-model.js";
import { useSwapList, useSwapPick } from "./use-swap-candidates.js";
import type { SwapApi, SwapDone } from "./use-swap-candidates.js";

interface Props {
  readonly projectId: string;
  readonly directionId: string;
  readonly use: SourceLoc;
  readonly onDone: (result: SwapDone) => void;
  readonly onClose: () => void;
}

const swapApi: SwapApi = {
  listCandidates: async (site) => {
    try {
      return await componentCreateApi.swapCandidates(
        site.projectId,
        site.directionId,
        site.use
      );
    } catch (error: unknown) {
      return { candidates: [], from: "", note: apiMessage(error) };
    }
  },
  swap: async (site, candidate) => {
    try {
      const result = await componentCreateApi.swap(
        site.projectId,
        site.directionId,
        site.use,
        { file: candidate.file, name: candidate.name }
      );

      return {
        isOk: true,
        text: `${result.title}${toDroppedText(result.dropped)}`,
      };
    } catch (error: unknown) {
      return { isOk: false, text: apiMessage(error) };
    }
  },
};

const SwapInstanceMenu = ({
  projectId,
  directionId,
  use,
  onDone,
  onClose,
}: Props): ReactElement => {
  const root = useRef<HTMLDivElement>(null);
  const close = useCallback(() => onClose(), [onClose]);
  usePopover(true, root, close);
  useFitPopover(root, null, true);

  const site = useMemo(
    () => ({ directionId, projectId, use }),
    [directionId, projectId, use]
  );

  const list = useSwapList(site, swapApi);
  const { busyName, pick } = useSwapPick(site, swapApi, onDone, onClose);

  return (
    <div
      ref={root}
      className="ui-menu prp-swap-menu"
      role="menu"
      aria-label={copy.swapInstance}
    >
      <div className="ui-menu-section">
        <div className="ui-menu-label">{toSwapLabel(list)}</div>
        {list === null && (
          <p className="prp-swap-empty">{copy.findingComponentsThatFit}</p>
        )}
        {list?.candidates.map((candidate) => (
          <SwapCandidateRow
            key={toCandidateKey(candidate)}
            candidate={candidate}
            busyName={busyName}
            onPick={pick}
          />
        ))}
        {list?.note && <p className="prp-swap-empty">{list.note}</p>}
      </div>
    </div>
  );
};

export { SwapInstanceMenu };
