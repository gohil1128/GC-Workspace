import { cn } from "@/lib/utils";

// The 4-across stat row used on every list screen. `dark` is the screen's one
// espresso card; `amber` is the attention/CTA tile.
export function StatTile({
  label,
  value,
  meta,
  action,
  variant = "default",
  className,
}: {
  label: string;
  value: React.ReactNode;
  meta?: React.ReactNode;
  action?: React.ReactNode;
  variant?: "default" | "dark" | "amber";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded-[20px] border px-3.5 py-3 sm:gap-3 sm:px-5 sm:py-4",
        variant === "dark" && "border-espresso bg-espresso text-espresso-foreground",
        variant === "amber" && "border-warning/25 bg-warning-muted text-warning",
        variant === "default" && "border-border bg-card",
        className,
      )}
    >
      <div className="min-w-0">
        <div className={cn("text-xs", variant === "default" ? "text-muted-foreground" : "opacity-75")}>
          {label}
        </div>
        <div
          className={cn(
            "display-num mt-0.5 text-[20px] font-medium sm:text-[28px]",
            variant === "dark" && "text-amber",
          )}
        >
          {value}
        </div>
      </div>
      {action ?? (
        meta && (
          <span className={cn("shrink-0 text-xs", variant === "default" ? "text-muted-foreground" : "opacity-80")}>
            {meta}
          </span>
        )
      )}
    </div>
  );
}

export function StatTileRow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-2 gap-2.5 sm:gap-3.5 xl:grid-cols-4", className)}>{children}</div>;
}
