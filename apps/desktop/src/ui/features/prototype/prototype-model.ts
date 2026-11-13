import { copy } from "./copy.js";

interface PrototypeText {
  readonly hint: string;
  readonly placeholder: string;
  readonly prompt: string;
  readonly title: string;
}

const toCreateLabel = (
  isPending: boolean,
  routePath: string | null
): string => {
  if (!isPending) {
    return copy.create;
  }

  if (routePath === null) {
    return copy.creating;
  }

  return copy.routeCreating;
};

const toPrototypeText = (routePath: string | null): PrototypeText => {
  if (routePath === null) {
    return {
      hint: copy.hint,
      placeholder: copy.placeholder,
      prompt: copy.prompt,
      title: copy.title,
    };
  }

  return {
    hint: copy.routeHint,
    placeholder: copy.routePlaceholder,
    prompt: copy.routePrompt,
    title: `Redesign ${routePath}`,
  };
};

export { toCreateLabel, toPrototypeText };

export type { PrototypeText };
