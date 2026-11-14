const PNG_TYPE = "image/png";

const TEXT_TYPE = "text/plain";

const setClipboardImage = async (blob: Blob): Promise<void> => {
  await globalThis.navigator.clipboard.write([
    new ClipboardItem({ [PNG_TYPE]: blob }),
  ]);
};

const toTextBlob = async (text: Promise<string>): Promise<Blob> =>
  new Blob([await text], { type: TEXT_TYPE });

const setClipboardText = async (text: Promise<string>): Promise<boolean> => {
  try {
    await globalThis.navigator.clipboard.write([
      new ClipboardItem({ [TEXT_TYPE]: toTextBlob(text) }),
    ]);

    return true;
  } catch {
    return false;
  }
};

const getClipboardText = async (): Promise<string | null> => {
  try {
    return await globalThis.navigator.clipboard.readText();
  } catch {
    return null;
  }
};

export { getClipboardText, setClipboardImage, setClipboardText };
