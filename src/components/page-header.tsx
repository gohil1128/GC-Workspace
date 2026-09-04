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
  eyebrow?: string;
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
      <div>
        {eyebrow && <div className="text-xs text-muted-foreground">{eyebrow}</div>}
        <h1 className="display-num mt-1 text-[26px] font-medium sm:text-[34px]">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
