const reloadFramesMatching = (selector: string, root: ParentNode): void => {
  for (const frame of root.querySelectorAll<HTMLIFrameElement>(selector)) {
    const { src } = frame;

    if (src) {
      frame.src = src;
    }
  }
};

const reloadAppStageFrames = (): void =>
  reloadFramesMatching(".stage iframe.frame", document);

const frameLabelOf = (frameId: string): Element | null =>
  document.querySelector(
    `.frame-label[data-frame-id="${CSS.escape(frameId)}"]`
  );

const jumpToFrame = (frameId: string): void => {
  const id = CSS.escape(frameId);

  const target =
    document.querySelector(`.canvas-frame[data-frame-id="${id}"]`) ??
    frameLabelOf(frameId);

  target?.scrollIntoView({
    behavior: "smooth",
    block: "center",
    inline: "center",
  });
};

interface StageFrameElement {
  readonly directionId: string | null;
  readonly element: HTMLIFrameElement;
}

const listStageFrameElements = (stage: ParentNode): StageFrameElement[] =>
  [...stage.querySelectorAll<HTMLIFrameElement>("iframe.frame")].map(
    (element) => ({
      directionId:
        element.closest<HTMLElement>("[data-direction-id], .artboard")?.dataset
          .directionId ?? null,
      element,
    })
  );

const observeRulerChanges = (
  board: HTMLElement | null,
  host: HTMLElement | null,
  schedule: () => void
): (() => void) => {
  const boardObserver = new MutationObserver(schedule);

  if (board) {
    boardObserver.observe(board, {
      attributeFilter: ["style"],
      attributes: true,
    });
  }

  const sizeObserver = new ResizeObserver(schedule);

  if (host) {
    sizeObserver.observe(host);
  }

  const media = globalThis.matchMedia("(prefers-color-scheme: dark)");

  media.addEventListener("change", schedule);

  const themeObserver = new MutationObserver(schedule);

  themeObserver.observe(document.documentElement, {
    attributeFilter: ["class", "data-theme", "style"],
    attributes: true,
  });

  return (): void => {
    boardObserver.disconnect();
    sizeObserver.disconnect();
    themeObserver.disconnect();
    media.removeEventListener("change", schedule);
  };
};

export {
  frameLabelOf,
  jumpToFrame,
  listStageFrameElements,
  observeRulerChanges,
  reloadAppStageFrames,
  reloadFramesMatching,
};

export type { StageFrameElement };
