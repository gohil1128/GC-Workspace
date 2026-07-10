"use client";
import * as React from "react";
import { Camera, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Photo picker with two explicit sources:
//  - "Take photo": input with capture → opens the camera on phones
//  - "Gallery": plain file input → photo library on phones, file dialog on desktop
// Both call onPick with the chosen file.
export function PhotoInput({
  onPick,
  disabled,
  className,
}: {
  onPick: (file: File) => void;
  disabled?: boolean;
  className?: string;
}) {
  const cameraRef = React.useRef<HTMLInputElement>(null);
  const galleryRef = React.useRef<HTMLInputElement>(null);

  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onPick(f);
    e.target.value = ""; // allow re-picking the same file
  };

  const btn =
    "inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-xs font-medium " +
    "hover:bg-accent transition-colors disabled:opacity-50 disabled:pointer-events-none";

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handle} className="hidden" />
      <input ref={galleryRef} type="file" accept="image/*" onChange={handle} className="hidden" />
      <button type="button" className={btn} disabled={disabled} onClick={() => cameraRef.current?.click()}>
        <Camera className="h-3.5 w-3.5 text-brand" /> Take photo
      </button>
      <button type="button" className={btn} disabled={disabled} onClick={() => galleryRef.current?.click()}>
        <ImageIcon className="h-3.5 w-3.5 text-brand" /> Choose from gallery
      </button>
    </div>
  );
}
