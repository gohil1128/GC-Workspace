import { cn } from "@/lib/utils";
import { Spark } from "./spark";

// Glanceable stat tile used in the "pulse" strip. Optional inline spark on the
// right side reads as a tiny trend without competing with the number.
type Tone = "good" | "warn" | "bad" | "neutral";

const TONE_TEXT: Record<Tone, string> = {
  good: "text-success",
  warn: "text-warning",
  bad: "text-destructive",
  neutral: "text-foreground",
};
const TONE_ACCENT: Record<Tone, string> = {
  good: "bg-success",
  warn: "bg-warning",
  bad: "bg-destructive",
  neutral: "bg-brand",
};

export function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
  spark,
  sparkColor,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: Tone;
  spark?: number[];
  sparkColor?: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border bg-card p-4 shadow-soft transition-colors duration-200 hover:border-foreground/15">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", TONE_ACCENT[tone])} />
            <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
          </div>
          <div className={cn("mt-2 text-xl font-semibold num leading-none tracking-tight", TONE_TEXT[tone])}>
            {value}
          </div>
          {hint && <div className="mt-1.5 text-2xs text-muted-foreground truncate">{hint}</div>}
        </div>
        {spark && spark.length > 1 && (
          <div className={cn(TONE_TEXT[tone], "shrink-0 opacity-70")}>
            <Spark data={spark} width={72} height={28} stroke={sparkColor ?? "currentColor"} fill={sparkColor ?? "currentColor"} />
          </div>
        )}
      </div>
    </div>
  );
}
