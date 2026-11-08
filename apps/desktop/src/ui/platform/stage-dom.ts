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

export {
  frameLabelOf,
  jumpToFrame,
  reloadAppStageFrames,
  reloadFramesMatching,
};
