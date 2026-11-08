// Copied from github.com/nauvalazhar/ai at 9944bcffc7412b27315ce853a49b4ea6035dea98, adapted for the studio. See THIRD_PARTY_NOTICES.md.
import { Collapsible } from "@base-ui/react/collapsible";
import { cn } from "../../lib/utils";

const Exception = ({ className, ...props }: Collapsible.Root.Props): React.JSX.Element => 
  (
    <Collapsible.Root
      data-slot="exception"
      className={cn(
        "group/exception flex flex-col",
        "rounded-outer bg-surface ring ring-border",
        "overflow-hidden",
        className,
      )}
      {...props}
    />
  )
;

const ExceptionHeader = ({
  className,
  ...props
}: React.ComponentProps<"header">): React.JSX.Element => 
  (
    <header
      data-slot="exception-header"
      className={cn("flex items-center gap-2.5 px-4 h-11", className)}
      {...props}
    />
  )
;

const ExceptionType = ({
  className,
  ...props
}: React.ComponentProps<"span">): React.JSX.Element => 
  (
    <span
      data-slot="exception-type"
      className={cn(
        "shrink-0 mt-0.5",
        "font-mono text-xs font-medium",
        "rounded bg-destructive/10 text-destructive",
        "px-1.5 py-0.5",
        className,
      )}
      {...props}
    />
  )
;

const ExceptionMessage = ({
  className,
  ...props
}: React.ComponentProps<"div">): React.JSX.Element => 
  (
    <div
      data-slot="exception-message"
      className={cn("min-w-0 flex-1 text-sm text-foreground", className)}
      {...props}
    />
  )
;

const ExceptionAction = ({
  className,
  ...props
}: React.ComponentProps<"div">): React.JSX.Element => 
  (
    <div
      data-slot="exception-action"
      className={cn(
        "shrink-0 flex items-center gap-1",
        "**:[button]:text-sm **:[svg]:size-4",
        className,
      )}
      {...props}
    />
  )
;

const ExceptionTrigger = ({
  className,
  children,
  ...props
}: Collapsible.Trigger.Props): React.JSX.Element => 
  (
    <Collapsible.Trigger
      data-slot="exception-trigger"
      className={cn(
        "cursor-pointer select-none bg-transparent",
        "inline-flex items-center gap-1 px-1.5 py-1 rounded",
        "text-xs text-muted-foreground hover:text-foreground hover:bg-muted",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        "transition-colors",
        className,
      )}
      {...props}
    >
      {children}
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className="size-3.5 shrink-0 transition-transform duration-200 group-data-open/exception:rotate-90"
      >
        <path d="m9 18 6-6-6-6" />
      </svg>
    </Collapsible.Trigger>
  )
;

const ExceptionContent = ({
  className,
  children,
  ...props
}: Collapsible.Panel.Props): React.JSX.Element => 
  (
    <Collapsible.Panel
      data-slot="exception-content"
      className={cn(
        "overflow-hidden",
        "h-(--collapsible-panel-height)",
        "transition-[height] duration-150 ease-out",
        "data-starting-style:h-0 data-ending-style:h-0",
        className,
      )}
      {...props}
    >
      <div className="px-4 pb-3 pt-0.5">{children}</div>
    </Collapsible.Panel>
  )
;

const ExceptionFrames = ({
  className,
  ...props
}: React.ComponentProps<"ol">): React.JSX.Element => 
  (
    <ol
      data-slot="exception-frames"
      className={cn(
        "font-mono text-xs",
        "rounded bg-surface-elevated ring ring-border",
        "overflow-hidden",
        className,
      )}
      {...props}
    />
  )
;

type ExceptionFrameProps = React.ComponentProps<"li"> & {
  active?: boolean;
  internal?: boolean;
};

const ExceptionFrame = ({
  active,
  internal,
  className,
  ...props
}: ExceptionFrameProps): React.JSX.Element => 
  (
    <li
      data-slot="exception-frame"
      data-active={active ? "true" : undefined}
      data-internal={internal ? "true" : undefined}
      className={cn(
        "flex items-baseline gap-2 px-3 py-1.5",
        "border-l-2 border-transparent",
        "data-[active=true]:border-destructive data-[active=true]:bg-destructive/5",
        "data-[internal=true]:opacity-50",
        className,
      )}
      {...props}
    />
  )
;

const ExceptionFrameFunction = ({
  className,
  ...props
}: React.ComponentProps<"span">): React.JSX.Element => 
  (
    <span
      data-slot="exception-frame-function"
      className={cn("shrink-0 text-foreground", className)}
      {...props}
    />
  )
;

const ExceptionFrameLocation = ({
  className,
  ...props
}: React.ComponentProps<"span">): React.JSX.Element => 
  (
    <span
      data-slot="exception-frame-location"
      className={cn(
        "ml-auto min-w-0 truncate text-muted-foreground",
        className,
      )}
      {...props}
    />
  )
;

const ExceptionSource = ({
  className,
  ...props
}: React.ComponentProps<"div">): React.JSX.Element => 
  (
    <div
      data-slot="exception-source"
      className={cn(
        "mx-4 mb-3 rounded ring ring-border bg-surface-elevated overflow-hidden",
        className,
      )}
      {...props}
    />
  )
;

const ExceptionSourceHeader = ({
  className,
  ...props
}: React.ComponentProps<"header">): React.JSX.Element => 
  (
    <header
      data-slot="exception-source-header"
      className={cn(
        "flex items-center justify-between gap-2.5 px-4 h-9",
        "border-b border-border text-xs",
        "font-mono text-muted-foreground",
        className,
      )}
      {...props}
    />
  )
;

const ExceptionSourceContent = ({
  className,
  ...props
}: React.ComponentProps<"div">): React.JSX.Element => 
  (
    <div
      data-slot="exception-source-content"
      className={cn(
        "text-sm leading-relaxed px-3 py-3",
        "[&_pre]:bg-transparent! [&_pre]:outline-none!",
        "[&_code]:flex [&_code]:flex-col",
        "**:data-[active=true]:bg-destructive/5",
        "**:data-[active=true]:border-l-2",
        "**:data-[active=true]:border-destructive",
        "**:data-[active=true]:-mx-3",
        "**:data-[active=true]:px-2.5",
        className,
      )}
      {...props}
    />
  )
;

export { Exception, ExceptionAction, ExceptionContent, ExceptionFrame, ExceptionFrameFunction, ExceptionFrameLocation, ExceptionFrames, ExceptionHeader, ExceptionMessage, ExceptionSource, ExceptionSourceContent, ExceptionSourceHeader, ExceptionTrigger, ExceptionType };
