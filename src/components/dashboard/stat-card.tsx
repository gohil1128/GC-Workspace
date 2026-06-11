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
    <div className="group relative overflow-hidden rounded-2xl border bg-card p-4 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift">
      <div className="absolute left-0 top-0 h-full w-[3px] origin-top scale-y-50 opacity-60 transition-all duration-300 group-hover:scale-y-100 group-hover:opacity-100" style={{ backgroundColor: undefined }}>
        <div className={cn("h-full w-full", TONE_ACCENT[tone])} />
      </div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className={cn("mt-1.5 text-xl font-semibold num leading-none tracking-tight", TONE_TEXT[tone])}>
            {value}
          </div>
          {hint && <div className="mt-1.5 text-2xs text-muted-foreground truncate">{hint}</div>}
        </div>
        {spark && spark.length > 1 && (
          <div className={cn(TONE_TEXT[tone], "shrink-0 opacity-80")}>
            <Spark data={spark} width={72} height={28} stroke={sparkColor ?? "currentColor"} fill={sparkColor ?? "currentColor"} />
          </div>
        )}
      </div>
    </div>
  );
}
