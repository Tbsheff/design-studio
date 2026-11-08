import type { SourceLoc } from "@design-studio/contracts";
import { usePopover } from "@design-studio/ui";
import type { ReactElement } from "react";
import {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import type {
  SwapCandidate,
  SwapCandidateList,
} from "../../../shared/component-create.js";
import {
  apiMessage,
  componentCreateApi,
} from "../design-system/component-create-api.js";

import "../../styles/create-component.css";
import { copy } from "./copy.js";

interface Props {
  readonly projectId: string;
  readonly directionId: string;
  readonly use: SourceLoc;
  readonly onDone: (result: {
    readonly isOk: boolean;
    readonly text: string;
  }) => void;
  readonly onClose: () => void;
}

const hintOf = (item: SwapCandidate): string => {
  if (item.drop.length > 0) {
    return `drops ${item.drop.join(", ")}`;
  }

  if (item.add.length > 0) {
    return `adds ${item.add.join(", ")}`;
  }

  return "all props fit";
};

export default function SwapInstanceMenu({
  projectId,
  directionId,
  use,
  onDone,
  onClose,
}: Props): ReactElement {
  const [list, setList] = useState<SwapCandidateList | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const close = useCallback(() => onClose(), [onClose]);
  usePopover(true, root, close);
  useEffect(() => {
    let live = true;
    startTransition(async () => {
      try {
        const result = await componentCreateApi.swapCandidates(
          projectId,
          directionId,
          use
        );

        if (live) {
          setList(result);
        }
      } catch (error: unknown) {
        if (live) {
          setList({ candidates: [], from: "", note: apiMessage(error) });
        }
      }
    });

    return (): void => {
      live = false;
    };
  }, [projectId, directionId, use]);

  const pick = (item: SwapCandidate): void => {
    setBusy(item.name);
    startTransition(async () => {
      try {
        const result = await componentCreateApi.swap(
          projectId,
          directionId,
          use,
          {
            file: item.file,
            name: item.name,
          }
        );
        const dropped =
          result.dropped.length > 0
            ? `, dropped ${result.dropped.join(", ")}`
            : "";
        onDone({ isOk: true, text: `${result.title}${dropped}` });
      } catch (error: unknown) {
        onDone({ isOk: false, text: apiMessage(error) });
      } finally {
        onClose();
      }
    });
  };

  return (
    <div
      ref={root}
      className="ui-menu prp-swap-menu"
      role="menu"
      aria-label={copy.swapInstance}
    >
      <div className="ui-menu-section">
        <div className="ui-menu-label">
          {list?.from ? `Swap ${list.from} for` : "Swap for"}
        </div>
        {list === null && (
          <p className="prp-swap-empty">Finding components that fit…</p>
        )}
        {list?.candidates.map((item) => (
          <button
            key={`${item.file}#${item.name}`}
            type="button"
            role="menuitem"
            className="ui-menu-item"
            disabled={busy !== null}
            data-tip={item.file}
            onClick={() => pick(item)}
          >
            <span>{item.name}</span>
            <span className="prp-swap-hint">
              {busy === item.name ? "Swapping…" : hintOf(item)}
            </span>
          </button>
        ))}
        {list?.note && <p className="prp-swap-empty">{list.note}</p>}
      </div>
    </div>
  );
}
