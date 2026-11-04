const markFullScreenInPage = (value: string): void => {
  document.documentElement.dataset.fullscreen = value;
};

export { markFullScreenInPage };
