import type { Version } from "@design-studio/contracts";
import { lazy, Suspense } from "react";
import type { ReactNode } from "react";

const CompareCode = lazy(async () => {
  const loaded = await import("./compare-code.js");

  return { default: loaded.CompareCode };
});

interface CodePaneProps {
  readonly newer: Version;
  readonly older: Version;
  readonly projectId: string;
}

const CompareCodePane = ({
  newer,
  older,
  projectId,
}: CodePaneProps): ReactNode => (
  <div className="compare-code-scroll" data-mode="code">
    <Suspense fallback={null}>
      <CompareCode projectId={projectId} older={older} newer={newer} />
    </Suspense>
  </div>
);

export { CompareCodePane };
