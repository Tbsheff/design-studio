// Copied from github.com/nauvalazhar/ai at 9944bcffc7412b27315ce853a49b4ea6035dea98, adapted for the studio. See THIRD_PARTY_NOTICES.md.
import { Collapsible } from "@base-ui/react/collapsible";
import { cn } from "../../lib/utils";

const Reasoning = ({ className, ...props }: Collapsible.Root.Props): React.JSX.Element => 
  (
    <Collapsible.Root
      data-slot="reasoning"
      className={cn(
        "group grid grid-cols-[1fr_auto] items-center gap-x-2",
        className,
      )}
      {...props}
    />
  )
;

const ReasoningTrigger = ({
  className,
  children,
  ...props
}: Collapsible.Trigger.Props): React.JSX.Element => 
  (
    <Collapsible.Trigger
      data-slot="reasoning-trigger"
      className={cn(
        "justify-self-start cursor-pointer select-none bg-transparent",
        "inline-flex items-center gap-1.5 -ml-2 px-2 py-1 rounded text-sm",
        "text-muted-foreground hover:text-foreground hover:bg-accent",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        "transition-colors",
        className,
      )}
      {...props}
    >
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
        className={cn(
          "size-4 shrink-0 transition-transform duration-200",
          "group-data-open:rotate-90",
        )}
      >
        <path d="m9 18 6-6-6-6" />
      </svg>
      {children}
    </Collapsible.Trigger>
  )
;

const ReasoningContent = ({
  className,
  children,
  ...props
}: Collapsible.Panel.Props): React.JSX.Element => 
  (
    <Collapsible.Panel
      data-slot="reasoning-content"
      className={cn(
        "col-span-2 overflow-hidden",
        "h-(--collapsible-panel-height)",
        "transition-[height] duration-150 ease-out",
        "data-starting-style:h-0 data-ending-style:h-0",
        className,
      )}
      {...props}
    >
      <div className="pl-6 py-2 text-sm text-muted-foreground">{children}</div>
    </Collapsible.Panel>
  )
;

export { Reasoning, ReasoningContent, ReasoningTrigger };
