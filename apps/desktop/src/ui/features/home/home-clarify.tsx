import { Suspense } from "react";
import type { ReactElement } from "react";

import type { HomeScreen } from "./use-home-screen.js";

const CONTENTS = { display: "contents" } as const;

const HomeClarify = ({
  screen,
}: {
  readonly screen: HomeScreen;
}): ReactElement | null => {
  const { ClarifyForm, base, draft, refs, submit } = screen;
  const { clarifyRef } = refs;
  const { buildWithAnswers, cancelQuestions, skipQuestions } = submit;

  if (draft.questions === null) {
    return null;
  }

  return (
    <div ref={clarifyRef} style={CONTENTS}>
      <Suspense fallback={null}>
        <ClarifyForm
          questions={draft.questions}
          busy={base.busy === "create"}
          onBuild={buildWithAnswers}
          onSkip={skipQuestions}
          onCancel={cancelQuestions}
        />
      </Suspense>
    </div>
  );
};

export { HomeClarify };
