import { createElement, useMemo } from "react";
import type { ReactElement } from "react";

type RenderTag = "button" | "div";

const useElementRender = (tag: RenderTag, className: string): ReactElement =>
  useMemo(() => createElement(tag, { className }), [tag, className]);

export { useElementRender };
