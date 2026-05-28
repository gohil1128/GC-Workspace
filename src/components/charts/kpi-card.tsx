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
  const dotClasses = {
    neutral: "bg-brand/60",
    good: "bg-success",
    warn: "bg-warning",
    bad: "bg-destructive",
  }[tone];
  return (
    <div className="group relative overflow-hidden rounded-2xl border bg-card p-5 flex flex-col gap-2 shadow-card transition-all duration-200 hover:shadow-lift hover:-translate-y-0.5">
      <div className="flex items-center gap-2">
        <span className={cn("h-1.5 w-1.5 rounded-full", dotClasses)} />
        <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <div className={cn("text-[1.75rem] font-semibold num leading-none tracking-tight", toneClasses)}>{value}</div>
      <div className="flex items-center justify-between pt-0.5">
        {delta ? <span className="text-xs text-muted-foreground">{delta}</span> : <span />}
        {hint && <span className="text-2xs text-muted-foreground">{hint}</span>}
      </div>
    </div>
  );
}
