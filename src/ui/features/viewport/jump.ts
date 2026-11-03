const jumpToCell = (frameId: string): void => {
  const id = CSS.escape(frameId);

  const target =
    document.querySelector(`.canvas-frame[data-frame-id="${id}"]`) ??
    document.querySelector(`.frame-label[data-frame-id="${id}"]`);

  target?.scrollIntoView({
    behavior: "smooth",
    block: "center",
    inline: "center",
  });
};

export { jumpToCell };
