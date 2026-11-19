"use client";

import dynamic from "next/dynamic";
import type { MapPoint } from "./results-map";

/** Leaflet touches `window`, so it only loads in the browser. */
const ResultsMap = dynamic(() => import("./results-map"), {
  ssr: false,
  loading: () => <div className="h-[60vh] w-full animate-pulse rounded-2xl bg-surface-muted" />,
});

export function LazyMap(props: { points: MapPoint[]; className?: string }) {
  return <ResultsMap {...props} />;
}
export type { MapPoint };
