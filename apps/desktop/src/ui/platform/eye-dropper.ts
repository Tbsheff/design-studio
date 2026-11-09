interface EyeDropperResult {
  readonly sRGBHex: string;
}

interface EyeDropperInstance {
  readonly open: () => Promise<EyeDropperResult>;
}

interface EyeDropperHost {
  readonly EyeDropper: new () => EyeDropperInstance;
}

const isEyeDropperHost = (
  host: typeof globalThis
): host is EyeDropperHost & typeof globalThis => "EyeDropper" in host;

const isEyeDropperSupported = (): boolean => isEyeDropperHost(globalThis);

const pickScreenColor = async (): Promise<string | null> => {
  const host = globalThis;

  if (!isEyeDropperHost(host)) {
    return null;
  }

  try {
    const result = await new host.EyeDropper().open();

    return result.sRGBHex;
  } catch {
    return null;
  }
};

export { isEyeDropperSupported, pickScreenColor };
