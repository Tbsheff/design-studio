// Copied from github.com/nauvalazhar/ai at 9944bcffc7412b27315ce853a49b4ea6035dea98, adapted for the studio. See THIRD_PARTY_NOTICES.md.
import { useRender } from "@base-ui/react/use-render";
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { cn } from "../../lib/utils";

interface CodeBlockContextValue {
  clip: boolean;
  maxHeight: number;
  open: boolean;
  setOpen: (open: boolean) => void;
  overflowing: boolean;
  setOverflowing: (overflowing: boolean) => void;
  contentId: string;
}

const CodeBlockContext = createContext<CodeBlockContextValue | null>(null);

const useCodeBlockContext = () => {
  const ctx = useContext(CodeBlockContext);

  if (!ctx) {
    throw new Error("CodeBlock parts must be rendered inside <CodeBlock>.");
  }

  return ctx;
};

type CodeBlockProps = React.ComponentProps<"div"> & {
  clip?: boolean;
  maxHeight?: number;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};

interface BlockHeightInput {
  clip: boolean;
  fullHeight: number | null;
  isOverflowing: boolean;
  maxHeight: number;
  open: boolean;
}

const toBlockHeight = (input: BlockHeightInput): number | undefined => {
  if (!input.clip) {
    return undefined;
  }

  if (input.fullHeight === null) {
    return input.open ? undefined : input.maxHeight;
  }

  if (!input.isOverflowing) {
    return undefined;
  }

  return input.open ? input.fullHeight : input.maxHeight;
};

const CodeBlock = ({
  clip = false,
  maxHeight = 240,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  className,
  ...props
}: CodeBlockProps): React.JSX.Element => {
  const [openState, setOpenState] = useState(defaultOpen);
  const [overflowing, setOverflowing] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : openState;
  const contentId = useId();

  const setOpen = (next: boolean) => {
    if (!isControlled) {setOpenState(next);}

    onOpenChange?.(next);
  };

  const clipped = clip && overflowing && !open;

  return (
    <CodeBlockContext.Provider
      value={{
        clip,
        contentId,
        maxHeight,
        open,
        overflowing,
        setOpen,
        setOverflowing,
      }}
    >
      <div
        data-slot="code-block"
        data-open={open || undefined}
        data-clipped={clipped || undefined}
        className={cn(
          "group/code-block",
          "p-1 bg-surface rounded-outer ring ring-border flex flex-col gap-1",
          className,
        )}
        {...props}
      />
    </CodeBlockContext.Provider>
  );
};

const CodeBlockHeader = ({
  children,
  className,
  ...props
}: React.ComponentProps<"header">): React.JSX.Element => 
  (
    <header
      data-slot="code-block-header"
      className={cn("px-3 h-8 flex items-center", className)}
      {...props}
    >
      {children}
    </header>
  )
;

const CodeBlockTitle = ({
  children,
  className,
  ...props
}: React.ComponentProps<"div">): React.JSX.Element => 
  (
    <div
      data-slot="code-block-title"
      className={cn("text-xs font-medium text-muted-foreground", className)}
      {...props}
    >
      {children}
    </div>
  )
;

const CodeBlockAction = ({
  children,
  className,
  ...props
}: React.ComponentProps<"div">): React.JSX.Element => 
  (
    <div
      data-slot="code-block-action"
      className={cn(
        "ml-auto flex items-center gap-1",
        "**:[button]:text-sm **:[svg]:size-4",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
;

const CodeBlockContent = ({
  children,
  className,
  ...props
}: React.ComponentProps<"div">): React.JSX.Element => {
  const { clip, maxHeight, open, contentId, setOverflowing } =
    useCodeBlockContext();

  const innerRef = useRef<HTMLDivElement>(null);
  const [fullHeight, setFullHeight] = useState<number | null>(null);

  useEffect(() => {
    if (!clip) {
      setOverflowing(false);
      setFullHeight(null);

      return;
    }

    const el = innerRef.current;

    if (!el) {return;}

    const update = () => {
      const h = el.scrollHeight;
      setFullHeight(h);
      setOverflowing(h > maxHeight);
    };

    update();

    const observer = new ResizeObserver(update);
    observer.observe(el);

    return () => observer.disconnect();
  }, [clip, maxHeight, setOverflowing]);

  const isOverflowing = fullHeight !== null && fullHeight > maxHeight;
  const clipped = clip && isOverflowing && !open;

  const height = toBlockHeight({ clip, fullHeight, isOverflowing, maxHeight, open });

  return (
    <div
      id={contentId}
      data-slot="code-block-content"
      data-open={open || undefined}
      data-clipped={clipped || undefined}
      className={cn(
        "bg-surface-elevated ring ring-border rounded [&_pre]:text-sm font-mono",
        "relative",
        clip &&
          "overflow-hidden transition-[height] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
        className,
      )}
      style={{ height: height === undefined ? undefined : `${height}px` }}
      {...props}
    >
      <div ref={innerRef} className="px-3 py-2">
        {children}
      </div>
      {clip && (
        <div
          aria-hidden
          data-slot="code-block-fade"
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-0 h-16",
            "bg-linear-to-t from-surface-elevated to-transparent rounded-b",
            "transition-opacity duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
            "opacity-0 group-data-clipped/code-block:opacity-100",
          )}
        />
      )}
    </div>
  );
};

const CodeBlockTrigger = ({
  render,
  ...props
}: useRender.ComponentProps<"button">): React.JSX.Element | null => {
  const { open, setOpen, contentId, clip, overflowing } = useCodeBlockContext();

  const element = useRender({
    defaultTagName: "button",
    props: {
      ...props,
      "aria-controls": contentId,
      "aria-expanded": open,
      "data-open": open || undefined,
      "data-slot": "code-block-trigger",
      onClick: () => setOpen(!open),
      type: "button",
    },
    render,
  });

  if (!clip || !overflowing) {return null;}

  return element;
};

export { CodeBlock, CodeBlockAction, CodeBlockContent, CodeBlockHeader, CodeBlockTitle, CodeBlockTrigger };
