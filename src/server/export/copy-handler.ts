import type { Project } from "../../shared/contracts.js";
import type { CopyCodeFormat, ExportFrame } from "../../shared/export.js";
import {
  defaultTailwindTheme,
  projectTailwindTheme,
} from "../direct-edit/tailwind/index.js";
import type { TailwindTheme } from "../direct-edit/tailwind/index.js";
import type { PreviewService } from "../types.js";
import { compact, readTree, renderHtml, renderTailwind } from "./copy-code.js";
import type { StyledNode } from "./copy-code.js";
import { reactKit, renderReact } from "./copy-react.js";

interface CopyScope {
  project: Project;
  url: string;
  workTree: string | null;
}

interface CopyInput {
  format: CopyCodeFormat;
  frame: ExportFrame;
  selector: string;
}

const COPY_FRAME: ExportFrame = {
  height: 900,
  name: "Desktop",
  width: 1440,
};

const compactTree = (node: StyledNode): StyledNode => ({
  ...node,
  children: node.children.map((child) => {
    if (child instanceof Object) {
      return compactTree(child);
    }

    return child;
  }),
  styles: compact(node.styles),
});

const themeOf = async (scope: CopyScope): Promise<TailwindTheme | null> => {
  if (!scope.workTree) {
    return null;
  }

  return await projectTailwindTheme(scope.workTree);
};

const asReact = async (scope: CopyScope, tree: StyledNode): Promise<string> => {
  const theme = await themeOf(scope);

  if (!scope.workTree) {
    return await renderReact(compactTree(tree), { kit: null, theme });
  }

  const kit = await reactKit(scope.project, scope.workTree);

  return await renderReact(compactTree(tree), { kit, theme });
};

const copyCode = async (
  preview: PreviewService,
  scope: CopyScope,
  input: CopyInput
): Promise<string> => {
  const tree = await readTree(preview, scope.url, input.frame, input.selector);

  if (input.format === "html") {
    return renderHtml(tree);
  }

  if (input.format === "react") {
    return await asReact(scope, tree);
  }

  const theme = (await themeOf(scope)) ?? (await defaultTailwindTheme());

  return renderTailwind(tree, theme);
};

export { COPY_FRAME, copyCode, type CopyInput, type CopyScope };
