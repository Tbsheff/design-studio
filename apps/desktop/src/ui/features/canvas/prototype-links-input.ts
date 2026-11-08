import type { PrototypeOptions } from "./prototype-options-model.js";
import type { useLinkRects } from "./use-link-rects.js";
import type { PrototypeFile } from "./use-prototype-state.js";

type LinkRectsInput = Parameters<typeof useLinkRects>[0];

const toFrontSrc = (options: PrototypeOptions): string | null => {
  const { frontToken, slots } = options.preview;

  return slots.find((slot) => slot.token === frontToken)?.src ?? null;
};

const toLinkRectsInput = (
  options: PrototypeOptions,
  prototypeFile: PrototypeFile
): LinkRectsInput => {
  const { frames, kind, passive } = options;
  const { elements, frontToken: token } = options.preview;
  const { file } = prototypeFile;
  const enabled = options.on;
  const frameId = options.active.id;
  const src = toFrontSrc(options);

  return {
    active: { elements, frameId, src, token },
    enabled,
    file,
    frames,
    kind,
    passive,
  };
};

export { toLinkRectsInput };
