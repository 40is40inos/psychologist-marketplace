"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { MapPin } from "lucide-react";
import { useCookieConsent } from "@/components/privacy/cookie-consent";
import type { MapPoint } from "./results-map";

/** Leaflet touches `window`, so it only loads in the browser. */
const ResultsMap = dynamic(() => import("./results-map"), {
  ssr: false,
  loading: () => <div className="h-[60vh] w-full animate-pulse rounded-2xl bg-surface-muted" />,
});

/**
 * Map tiles come from a third party that receives the visitor's IP address,
 * so the map loads only with consent (or a one-off "Show map" click).
 */
export function LazyMap(props: { points: MapPoint[]; className?: string; labels?: { mapPlaceholder: string; loadMap: string } }) {
  const consent = useCookieConsent();
  const [once, setOnce] = useState(false);
  if (consent === "all" || once || !props.labels) return <ResultsMap points={props.points} className={props.className} />;
  return (
    <div className={`${props.className ?? "h-[60vh]"} flex w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-surface-muted p-6 text-center`}>
      <MapPin className="size-6 text-primary" aria-hidden="true" />
      <p className="max-w-sm text-sm text-muted">{props.labels.mapPlaceholder}</p>
      <button type="button" onClick={() => setOnce(true)} className="inline-flex h-11 items-center rounded-xl border border-border bg-surface px-4 font-semibold text-ink hover:border-primary">
        {props.labels.loadMap}
      </button>
    </div>
  );
}
export type { MapPoint };
