import { targetFrame } from "@design-studio/contracts/link-interaction";
import {
  isFrameAction,
  LINK_ISSUE_TEXT,
  linkAction,
} from "@design-studio/contracts/links";
import { UiSelect } from "@design-studio/ui";
import { lazy, Suspense, useCallback } from "react";
import type { ReactElement } from "react";

import { loadLinkInteraction } from "../../canvas-link-slots.js";
import type { CanvasFrame } from "./canvas-frames-model.js";
import { copy } from "./copy.js";
import { changeLink } from "./link-changes.js";
import type { LinkChange } from "./link-changes.js";
import { LinkEditorAction } from "./link-editor-action.js";
import { LinkMotionSelects } from "./link-motion-selects.js";
import { protoCopy } from "./proto-copy.js";
import { ProtoSlot } from "./proto-slot.js";
import { toTargetOptions } from "./prototype-model.js";
import type { LinkState } from "./use-link-rects.js";
import { useLinkRunner } from "./use-link-runner.js";

const LinkInteractionEditor = lazy(async () => {
  const mod = await loadLinkInteraction();

  return { default: mod.LinkInteractionEditor };
});

interface LinkEditorProps {
  readonly projectId: string;
  readonly state: LinkState;
  readonly frames: CanvasFrame[];
  readonly toTitle: (frame: CanvasFrame) => string;
  readonly picked: string | null;
  readonly onPicking: (isPicking: boolean) => void;
  readonly onError: (message: string) => void;
}

const toTargetChange = (value: string): LinkChange => {
  if (value === "back") {
    return { to: { back: true } };
  }

  return { to: { frame: value } };
};

const LinkEditor = ({
  projectId,
  state,
  frames,
  toTitle,
  picked,
  onPicking,
  onError,
}: LinkEditorProps): ReactElement => {
  const { link } = state;
  const run = useLinkRunner(onError);
  const toFrames = isFrameAction(linkAction(link));

  const change = useCallback(
    (next: LinkChange): void => run(() => changeLink(projectId, link, next)),
    [link, projectId, run]
  );

  const handleTarget = useCallback(
    (value: string): void => change(toTargetChange(value)),
    [change]
  );

  return (
    <div className="proto-editor" data-testid="link-editor">
      {link.implicit && (
        <span className="proto-found" data-tip={copy.foundFromA}>
          {protoCopy.foundInPage}
        </span>
      )}
      <Suspense fallback={null}>
        <LinkInteractionEditor
          key={link.id}
          projectId={projectId}
          link={link}
          frames={frames}
          picked={picked}
          onPicking={onPicking}
          onError={onError}
        />
      </Suspense>
      {toFrames && (
        <ProtoSlot isNarrow={false}>
          <UiSelect
            aria-label={copy.linkTarget}
            value={targetFrame(link.to) ?? "back"}
            options={toTargetOptions(link, frames, toTitle)}
            onChange={handleTarget}
          />
        </ProtoSlot>
      )}
      {toFrames && <LinkMotionSelects link={link} onChange={change} />}
      {state.issue && (
        <output className="proto-broken">{LINK_ISSUE_TEXT[state.issue]}</output>
      )}
      <LinkEditorAction projectId={projectId} link={link} run={run} />
    </div>
  );
};

export { LinkEditor };
