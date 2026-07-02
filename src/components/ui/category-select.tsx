"use client";
import * as React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Preset-driven category picker that still honors a legacy custom value: if
// the current value isn't in the preset list it's appended as its own option
// so nothing already saved gets clobbered. Form-compatible via hidden input.
export function CategorySelect({
  options,
  value,
  onValueChange,
  name,
  id,
  defaultValue,
  placeholder = "Pick a category",
}: {
  options: readonly string[];
  value?: string;
  onValueChange?: (v: string) => void;
  name?: string;
  id?: string;
  defaultValue?: string | null;
  placeholder?: string;
}) {
  const [internal, setInternal] = React.useState<string>(defaultValue ?? "");
  const isControlled = value !== undefined;
  const current = isControlled ? value : internal;

  const handle = (v: string) => {
    if (!isControlled) setInternal(v);
    onValueChange?.(v);
  };

  const hasCustom = !!current && !options.includes(current);

  return (
    <>
      {name && <input type="hidden" name={name} value={current ?? ""} />}
      <Select value={current || undefined} onValueChange={handle}>
        <SelectTrigger id={id}><SelectValue placeholder={placeholder} /></SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o}>{o}</SelectItem>
          ))}
          {hasCustom && <SelectItem value={current!}>{current}</SelectItem>}
        </SelectContent>
      </Select>
    </>
  );
}
