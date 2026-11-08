import { PNG } from "pngjs";

import {
  LayerRefError,
  layersAtPaths,
  resolveLayerRef,
  toProbeTarget,
} from "../../page-probe/index.js";
import type { Layer } from "../../page-probe/index.js";
import type { PreviewService } from "../../preview/index.js";
import { createFrameCapture } from "../critique-capture.js";
import type { FrameTarget } from "../critique-target.js";
import { toAttentionElement, toScaledBox } from "./attention-elements.js";
import { toAttentionProbe } from "./attention-probe.js";
import type {
  RawAttentionElement,
  RawAttentionProbe,
} from "./attention-probe.js";
import type {
  AttentionBox,
  AttentionElement,
  AttentionImage,
} from "./engine/index.js";

interface AttentionCapture {
  readonly elements: readonly AttentionElement[];
  readonly image: AttentionImage;
  readonly scope: AttentionBox | null;
}

interface CaptureRequest {
  readonly layerId: string | null;
  readonly width: number;
}

const PROBE_MAX = 400;

const toImage = (base64: string): AttentionImage => {
  const png = PNG.sync.read(Buffer.from(base64, "base64"));

  return {
    height: png.height,
    rgba: new Uint8Array(
      png.data.buffer,
      png.data.byteOffset,
      png.data.byteLength
    ),
    width: png.width,
  };
};

interface ViewportSize {
  readonly height: number;
  readonly width: number;
}

const toViewport = (
  target: FrameTarget,
  request: CaptureRequest
): ViewportSize => ({
  height: target.frame.height,
  width: request.width,
});

const toScopePath = (
  preview: PreviewService,
  target: FrameTarget,
  request: CaptureRequest
): Promise<string | null> => {
  if (request.layerId === null) {
    return Promise.resolve(null);
  }

  const probeTarget = toProbeTarget(
    preview,
    target.url,
    toViewport(target, request),
    target.scope
  );

  return resolveLayerRef(probeTarget, request.layerId);
};

const toProbedElements = async (
  preview: PreviewService,
  target: FrameTarget,
  request: CaptureRequest
): Promise<{ extra: RawAttentionProbe; layers: (Layer | null)[] }> => {
  const scopePath = await toScopePath(preview, target, request);

  const probeTarget = toProbeTarget(
    preview,
    target.url,
    toViewport(target, request),
    target.scope
  );

  return layersAtPaths<RawAttentionProbe>(
    probeTarget,
    target.frame.path,
    async (probe) => {
      const expression = toAttentionProbe({ max: PROBE_MAX, scope: scopePath });
      const raw = await probe.evaluate<RawAttentionProbe>(expression);

      return { extra: raw, paths: raw.elements.map((element) => element.path) };
    }
  );
};

const toScope = (
  box: RawAttentionElement["box"] | null,
  scale: number
): AttentionBox | null => {
  if (box === null) {
    return null;
  }

  return toScaledBox(box, scale);
};

const runAttentionCapture = async (
  preview: PreviewService,
  target: FrameTarget,
  request: CaptureRequest
): Promise<AttentionCapture> => {
  const [capture, probed] = await Promise.all([
    createFrameCapture(preview, {
      ...toViewport(target, request),
      label: `Frame ${target.frame.id}`,
      page: target.frame.path,
      scope: target.scope,
      url: target.url,
    }),
    toProbedElements(preview, target, request),
  ]);

  const [shot] = capture.shots;

  if (!shot) {
    throw new Error("The render gave no picture.");
  }

  if (probed.extra.isScopeMissing) {
    throw new LayerRefError(
      `The layer ${request.layerId} is not on this frame.`
    );
  }

  const image = toImage(shot.base64);
  const scale = image.width / request.width;

  const elements = probed.extra.elements.map((raw, index) =>
    toAttentionElement(raw, probed.layers[index] ?? null, scale)
  );

  return { elements, image, scope: toScope(probed.extra.scopeBox, scale) };
};

export { runAttentionCapture };

export type { AttentionCapture, CaptureRequest };
