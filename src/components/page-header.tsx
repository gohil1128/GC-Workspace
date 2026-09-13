import { cn } from "@/lib/utils";

// Page masthead: small breadcrumb eyebrow over a large display title, with
// pill actions on the right. No divider — the cream canvas separates it from
// the bento cards below.
export function PageHeader({
  title,
  eyebrow,
  description,
  actions,
  className,
}: {
  title: string;
  eyebrow?: React.ReactNode;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto flex max-w-[1400px] flex-col gap-3 px-4 pb-1 pt-5 sm:flex-row sm:items-end sm:justify-between sm:gap-4 sm:px-6 sm:pt-6 lg:px-8",
        className,
      )}
    >
      {/*
        The masthead sits inside the photograph band, so its type is light in
        both themes — the scrim behind it is ink either way. Display type at
        this size clears 3:1 over the scrim; the eyebrow and description are
        held at .78–.85 rather than pure white so they stay secondary without
        dropping under 4.5:1.
      */}
      <div>
        {/* /80, not /78: Tailwind's opacity scale steps in fives, so a value
            off the scale generates no rule at all and the text silently falls
            back to the inherited dark ink — invisible on the photograph. */}
        {eyebrow && <div className="text-xs text-white/80">{eyebrow}</div>}
        <h1 className="display-num mt-1 text-[26px] font-medium text-white sm:text-[40px] sm:font-light sm:tracking-[-0.025em]">
          {title}
        </h1>
        {description && <p className="mt-1.5 text-sm text-white/85">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
