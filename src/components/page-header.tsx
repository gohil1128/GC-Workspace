import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b px-4 sm:px-8 py-6", className)}>
      <div className="space-y-1">
        <h1 className="text-[1.35rem] font-semibold leading-none tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground leading-snug">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
