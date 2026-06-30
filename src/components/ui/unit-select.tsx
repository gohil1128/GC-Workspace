"use client";
import * as React from "react";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UNIT_GROUPS, resolveUnit } from "@/lib/units";

// Grouped unit picker (Weight / Volume / Count / Packaging). Works both as a
// controlled component (value+onValueChange) and inside a plain <form> via the
// hidden input when `name` is provided.
export function UnitSelect({
  value,
  onValueChange,
  name,
  id,
  defaultValue,
  placeholder = "Unit",
}: {
  value?: string;
  onValueChange?: (v: string) => void;
  name?: string;
  id?: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  // Normalize any legacy free-text default ("Lb", "gram") to a canonical value.
  const normalizedDefault = defaultValue ? (resolveUnit(defaultValue)?.value ?? defaultValue) : undefined;
  const [internal, setInternal] = React.useState<string>(normalizedDefault ?? "");
  const isControlled = value !== undefined;
  const current = isControlled ? value : internal;

  const handle = (v: string) => {
    if (!isControlled) setInternal(v);
    onValueChange?.(v);
  };

  return (
    <>
      {name && <input type="hidden" name={name} value={current ?? ""} />}
      <Select value={current || undefined} onValueChange={handle}>
        <SelectTrigger id={id}><SelectValue placeholder={placeholder} /></SelectTrigger>
        <SelectContent>
          {UNIT_GROUPS.map((g) => (
            <SelectGroup key={g.dimension}>
              <SelectLabel>{g.label}</SelectLabel>
              {g.units.map((u) => (
                <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}
