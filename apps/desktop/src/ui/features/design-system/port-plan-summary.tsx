import type { PortFlowPage } from "@design-studio/contracts/port";
import type { ReactElement } from "react";

import { toChoice } from "./choose-text.js";
import { COPY } from "./copy.js";
import { KitChips } from "./port-kit-chips.js";
import { toContentText, toKitList } from "./port-model.js";
import { PlanFile } from "./port-plan-file.js";
import { PlanRow } from "./port-plan-row.js";

const VALUE_CLASS = "port-plan-value";
const KIT_CLASS = "port-plan-value port-kit";

const toTokensText = (plan: PortFlowPage["plan"]): string => {
  const mapped = plan.tokens.filter((token) => token.target).length;

  return `${mapped} ${COPY.textOf}${plan.tokens.length} ${COPY.textMapToAppTokens}${plan.inlineStyles} ${COPY.textInlineStylesStayOut}`;
};

const PlanSummary = ({
  pages,
  links,
  isLoading,
  error,
}: {
  pages: PortFlowPage[];
  links: number;
  isLoading: boolean;
  error: string | null;
}): ReactElement => {
  if (error) {
    return <p className="port-note error">{error}</p>;
  }

  const first = pages[0]?.plan;

  if (!first) {
    return (
      <p className="port-note">
        {toChoice(isLoading, COPY.textReadingThePages, COPY.textPickAnAppToSee)}
      </p>
    );
  }

  const routeFile = first.target?.routeFile ?? null;

  return (
    <section
      className="port-plan"
      aria-busy={isLoading}
      aria-label={COPY.labelPortPlan}
    >
      <PlanRow label={COPY.textContent} valueClass={VALUE_CLASS}>
        {toContentText(pages, links)}
      </PlanRow>
      <PlanRow label={COPY.textKit} valueClass={KIT_CLASS}>
        <KitChips kit={toKitList(pages)} />
      </PlanRow>
      <PlanRow label={COPY.textTokens} valueClass={VALUE_CLASS}>
        {toTokensText(first)}
      </PlanRow>
      {pages.length === 1 && routeFile && <PlanFile routeFile={routeFile} />}
    </section>
  );
};

export { PlanSummary };
