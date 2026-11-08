import { CopyButton } from "@design-studio/ui";
import { isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "../../lib/utils";
import { CodeBlock } from "./code-block";
import { CodeBlockContent } from "./code-block-content";
import { CodeBlockHeader } from "./code-block-header";
import { CodeBlockTitle } from "./code-block-title";

interface MarkdownProps {
  readonly children: string;
  readonly className?: string;
}

interface CodeProps {
  className?: string;
  children?: ReactNode;
}

const LANGUAGE_PATTERN = /language-(?<language>\w+)/u;
const TRAILING_NEWLINE = /\n$/u;
const FENCE_PATTERN = /```/gu;
const REMARK_PLUGINS = [remarkGfm];

const toLanguage = (className: string | undefined): string => {
  const matched = LANGUAGE_PATTERN.exec(className ?? "");

  return matched?.groups?.language ?? "text";
};

const toSource = (code: ReactNode): string =>
  String(code ?? "").replace(TRAILING_NEWLINE, "");

const DEFAULT_COMPONENTS: Components = {
  "a": ({ children, href }): ReactElement => (
    <a href={href} rel="noopener noreferrer" target="_blank">
      {children}
    </a>
  ),
  img: ({ alt }): ReactElement => <span>{alt ?? ""}</span>,
  pre: ({ children }): ReactElement => {
    if (!isValidElement<CodeProps>(children)) {
      return <pre>{children}</pre>;
    }

    const { children: code, className } = children.props;
    const language = toLanguage(className);
    const source = toSource(code);

    return (
      <CodeBlock>
        <CodeBlockHeader>
          <CodeBlockTitle>{language}</CodeBlockTitle>
          <CopyButton label="Copy code" text={source} />
        </CodeBlockHeader>
        <CodeBlockContent>
          <pre className="whitespace-pre-wrap wrap-break-word">{source}</pre>
        </CodeBlockContent>
      </CodeBlock>
    );
  },
};

const closeIncompleteFence = (source: string): string => {
  const fences = source.match(FENCE_PATTERN);

  if (fences && fences.length % 2 === 1) {
    return `${source}\n\`\`\``;
  }

  return source;
};

const Markdown = ({ children, className }: MarkdownProps): ReactElement => (
  <div
    className={cn(
      "prose prose-sm dark:prose-invert max-w-none min-w-0",
      className
    )}
    data-slot="markdown"
  >
    <ReactMarkdown
      components={DEFAULT_COMPONENTS}
      remarkPlugins={REMARK_PLUGINS}
    >
      {closeIncompleteFence(children)}
    </ReactMarkdown>
  </div>
);

export { Markdown };
