import type { ParentToBridge } from "@design-studio/contracts";

import { appElementBySource } from "./app-source.js";
import type { BridgeContext } from "./bridge-types.js";
import { isString } from "./dom-input.js";
import { textOf } from "./element-info.js";
import { elementBySource } from "./reorder.js";
import { APP_MODE } from "./session.js";

type SelectSource = Extract<ParentToBridge, { type: "select-source" }>;

interface SourceRef {
  readonly sourceLoc: string;
  readonly tag: string;
  readonly text: string;
}

const toOtherRefs = (message: SelectSource): readonly SourceRef[] => {
  const refs: SourceRef[] = [];

  if (!Array.isArray(message.others)) {
    return refs;
  }

  for (const other of message.others) {
    if (isString(other.sourceLoc) && isString(other.tag)) {
      refs.push({ sourceLoc: other.sourceLoc, tag: other.tag, text: "" });
    }
  }

  return refs;
};

const toSourceElement = (
  message: SelectSource,
  ref: SourceRef
): Promise<Element | null> => {
  const found = elementBySource({ ...message, ...ref }, textOf);

  if (found || APP_MODE !== "next") {
    return Promise.resolve(found);
  }

  return appElementBySource(ref.sourceLoc, ref.tag);
};

const toUniqueElements = (found: readonly (Element | null)[]): Element[] => {
  const unique = new Set<Element>();

  for (const element of found) {
    if (element) {
      unique.add(element);
    }
  }

  return [...unique];
};

const selectSources = async (
  message: SelectSource,
  refs: readonly SourceRef[],
  postSelectMany: BridgeContext["postSelectMany"]
): Promise<void> => {
  const first = {
    sourceLoc: message.sourceLoc,
    tag: message.tag,
    text: message.text,
  };

  const found = await Promise.all(
    [first, ...refs].map((ref) => toSourceElement(message, ref))
  );

  const elements = toUniqueElements(found);

  if (elements.length > 0) {
    await postSelectMany(elements, false);
  }
};

const selectOneSource = async (
  message: SelectSource,
  postSelect: BridgeContext["postSelect"]
): Promise<void> => {
  const element = elementBySource(message, textOf);

  if (element) {
    postSelect(element, false);

    return;
  }

  if (
    APP_MODE !== "next" ||
    !isString(message.sourceLoc) ||
    !isString(message.tag)
  ) {
    return;
  }

  const found = await appElementBySource(message.sourceLoc, message.tag);

  if (found) {
    postSelect(found, false);
  }
};

const selectSource = (message: SelectSource, context: BridgeContext): void => {
  const refs = toOtherRefs(message);

  if (refs.length > 0) {
    void selectSources(message, refs, context.postSelectMany);

    return;
  }

  void selectOneSource(message, context.postSelect);
};

export { selectSource };
