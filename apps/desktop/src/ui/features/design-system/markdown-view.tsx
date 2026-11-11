import { lazy, Suspense } from "react";
import type { ReactElement } from "react";

const Markdown = lazy(async () => {
  const loaded = await import("../../ai/components/ai/markdown.js");

  return { default: loaded.Markdown };
});

const MarkdownView = ({
  children,
}: {
  readonly children: string;
}): ReactElement => (
  <Suspense fallback={null}>
    <Markdown>{children}</Markdown>
  </Suspense>
);

export { MarkdownView };
