const PNG_TYPE = "image/png";

const setClipboardImage = async (blob: Blob): Promise<void> => {
  await globalThis.navigator.clipboard.write([
    new ClipboardItem({ [PNG_TYPE]: blob }),
  ]);
};

export { setClipboardImage };
