import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";

export function SectionTitle({
  eyebrow,
  title,
  subtitle,
  href,
  cta,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: ReactNode;
  href?: string;
  cta?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-4 px-1">
      <div>
        {eyebrow && (
          <div className="text-2xs font-semibold uppercase tracking-[0.18em] text-brand mb-1.5">{eyebrow}</div>
        )}
        <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground mt-1 max-w-2xl">{subtitle}</p>}
      </div>
      {href && (
        <Link
          href={href}
          className="group inline-flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          {cta ?? "Explore"}
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
