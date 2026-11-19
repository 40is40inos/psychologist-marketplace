"use client";

import { useState } from "react";
import { Play } from "lucide-react";

/** Click-to-load: no third-party requests until the visitor chooses to play. */
export function VideoEmbed({ src, title, consent, play }: { src: string; title: string; consent: string; play: string }) {
  const [on, setOn] = useState(false);
  if (on) {
    return (
      <div className="aspect-video overflow-hidden rounded-2xl border border-border">
        <iframe src={src} title={title} className="size-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => setOn(true)}
      className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-surface-muted p-6 text-center"
    >
      <span className="grid size-14 place-items-center rounded-full bg-primary text-primary-ink">
        <Play className="size-6" aria-hidden="true" />
      </span>
      <span className="font-semibold text-ink">{play}</span>
      <span className="max-w-sm text-xs text-muted">{consent}</span>
    </button>
  );
}
