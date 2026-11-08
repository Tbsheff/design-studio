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

export { reloadAppStageFrames, reloadFramesMatching };
