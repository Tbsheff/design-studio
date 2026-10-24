// Copied from github.com/nauvalazhar/ai at 9944bcffc7412b27315ce853a49b4ea6035dea98, adapted for the studio. See THIRD_PARTY_NOTICES.md.
import { isValidElement, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  CodeBlock,
  CodeBlockContent,
  CodeBlockHeader,
  CodeBlockTitle,
} from "./code-block";
import { cn } from "../../lib/utils";
import { CopyButton } from "../../../components/CopyButton";

type MarkdownProps = React.ComponentProps<"div"> & {
  children: string;
  components?: Components;
};

type CodeProps = {
  className?: string;
  children?: ReactNode;
};

const defaultComponents: Components = {
  a({ href, children }) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  },
  img({ alt }) {
    return <span>{alt ?? ""}</span>;
  },
  pre({ children }) {
    if (!isValidElement<CodeProps>(children)) return <pre>{children}</pre>;

    const { className, children: code } = children.props;
    const language = className?.match(/language-(\w+)/)?.[1] ?? "text";
    const source = String(code ?? "").replace(/\n$/, "");

    return (
      <CodeBlock className="not-prose my-3">
        <CodeBlockHeader className="code-block-head">
          <CodeBlockTitle>{language}</CodeBlockTitle>
          <CopyButton text={source} label="Copy code" className="code-copy" />
        </CodeBlockHeader>
        <CodeBlockContent>
          <pre className="whitespace-pre-wrap wrap-break-word">{source}</pre>
        </CodeBlockContent>
      </CodeBlock>
    );
  },
};

// Streaming markdown can land mid-fence. If we have an odd number of ``` markers
// the renderer otherwise dumps the remainder as plain text and the layout shifts
// the moment the closing fence arrives. Synthesizing a closing fence keeps the
// block stable until the real one lands.
function closeIncompleteFence(source: string) {
  const fences = source.match(/```/g);
  if (fences && fences.length % 2 === 1) return `${source}\n\`\`\``;
  return source;
}

export function Markdown({
  children,
  components,
  className,
  ...props
}: MarkdownProps) {
  const merged = components
    ? { ...defaultComponents, ...components }
    : defaultComponents;

  return (
    <div
      data-slot="markdown"
      className={cn(
        "prose prose-sm dark:prose-invert max-w-none min-w-0",
        className,
      )}
      {...props}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={merged}>
        {closeIncompleteFence(children)}
      </ReactMarkdown>
    </div>
  );
}
