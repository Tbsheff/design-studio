import { routes as variantRoutes } from "@design-studio/actions/component-variant/routes";
import type {
  ComponentVariantChange,
  ComponentVariantResult,
  ComponentVariantTarget,
} from "@design-studio/contracts/component-variant";

import { call } from "./http";

interface VariantPreviewBody {
  readonly className: string | null;
  readonly file: string;
  readonly key: string;
  readonly name: string;
  readonly value: string;
}

interface VariantWritten extends ComponentVariantResult {
  readonly png: string | null;
}

const toPngBlob = (png: string): Blob => {
  const bytes = Uint8Array.from(atob(png), (char) => char.codePointAt(0) ?? 0);

  return new Blob([bytes], { type: "image/png" });
};

const getVariantPreviewAt = async (
  pid: string,
  did: string,
  body: VariantPreviewBody
): Promise<Blob> => {
  const reply = await call(variantRoutes.getComponentVariant, {
    className: body.className,
    directionId: did,
    file: body.file,
    key: body.key,
    name: body.name,
    projectId: pid,
    value: body.value,
  });

  if (reply.png === null) {
    throw new Error(reply.reason ?? "No preview.");
  }

  return toPngBlob(reply.png);
};

const writeVariantAt = (
  pid: string,
  did: string,
  target: ComponentVariantTarget,
  change: ComponentVariantChange
): Promise<VariantWritten> => {
  const scope = {
    cva: target.cva,
    directionId: did,
    file: target.file,
    name: target.name,
    projectId: pid,
  };

  if (change.kind === "create") {
    return call(variantRoutes.createComponentVariant, {
      ...scope,
      classes: change.classes,
      copyFrom: change.copyFrom,
      key: change.key,
      newKey: change.newKey,
      setDefault: change.setDefault,
      value: change.value,
    });
  }

  return call(variantRoutes.updateComponentVariant, {
    ...scope,
    classes: change.classes,
    key: change.key,
    rename: change.rename,
    setDefault: change.setDefault,
    value: change.value,
  });
};

export { getVariantPreviewAt, writeVariantAt };

export type { VariantPreviewBody, VariantWritten };
