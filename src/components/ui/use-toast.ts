"use client";
import * as React from "react";
import type { ToastProps } from "@/components/ui/toast";

type ToasterToast = ToastProps & { id: string; title?: React.ReactNode; description?: React.ReactNode };
const listeners: Array<(t: ToasterToast[]) => void> = [];
let memoryState: ToasterToast[] = [];

function dispatch(next: ToasterToast[]) {
  memoryState = next;
  listeners.forEach((l) => l(memoryState));
}

export function toast(props: Omit<ToasterToast, "id">) {
  const id = Math.random().toString(36).slice(2);
  const t: ToasterToast = { ...props, id };
  dispatch([t, ...memoryState].slice(0, 5));
  setTimeout(() => dispatch(memoryState.filter((x) => x.id !== id)), 5000);
  return id;
}

export function useToast() {
  const [state, setState] = React.useState<ToasterToast[]>(memoryState);
  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const i = listeners.indexOf(setState);
      if (i > -1) listeners.splice(i, 1);
    };
  }, []);
  return { toasts: state, toast };
}
