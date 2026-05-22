import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  delta,
  tone = "neutral",
  hint,
}: {
  label: string;
  value: string;
  delta?: string;
  tone?: "neutral" | "good" | "warn" | "bad";
  hint?: string;
}) {
  const toneClasses = {
    neutral: "text-foreground",
    good: "text-success",
    warn: "text-warning",
    bad: "text-destructive",
  }[tone];
  return (
    <div className="rounded-lg border bg-card p-4 flex flex-col gap-1.5">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("text-2xl font-semibold num leading-tight", toneClasses)}>{value}</div>
      <div className="flex items-center justify-between">
        {delta ? <span className="text-xs text-muted-foreground">{delta}</span> : <span />}
        {hint && <span className="text-2xs text-muted-foreground">{hint}</span>}
      </div>
    </div>
  );
}
