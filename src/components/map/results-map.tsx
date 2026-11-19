"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";

export interface MapPoint {
  slug: string;
  name: string;
  lat: number;
  lng: number;
  label: string;
  href: string;
}

// Custom HTML marker: no image assets to bundle, follows the theme colours.
const pin = L.divIcon({
  className: "",
  html: '<span style="display:block;width:22px;height:22px;border-radius:9999px;background:var(--primary);border:3px solid var(--surface);box-shadow:0 1px 4px rgba(0,0,0,.35)"></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  popupAnchor: [0, -12],
});

function FitBounds({ points }: { points: MapPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 1) map.setView([points[0].lat, points[0].lng], 14);
    else if (points.length > 1) map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng])), { padding: [40, 40], maxZoom: 14 });
  }, [map, points]);
  return null;
}

const TILE_URL = process.env.NEXT_PUBLIC_MAP_TILE_URL ?? "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION = process.env.NEXT_PUBLIC_MAP_ATTRIBUTION ?? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

export default function ResultsMap({ points, className = "h-[60vh]" }: { points: MapPoint[]; className?: string }) {
  const center: [number, number] = points[0] ? [points[0].lat, points[0].lng] : [38.3, 23.7];
  return (
    <MapContainer center={center} zoom={points.length ? 12 : 6} scrollWheelZoom={false} className={`${className} w-full rounded-2xl border border-border z-0`}>
      <TileLayer url={TILE_URL} attribution={ATTRIBUTION} />
      <FitBounds points={points} />
      {points.map((p) => (
        <Marker key={p.slug} position={[p.lat, p.lng]} icon={pin} title={p.name}>
          <Popup>
            <a href={p.href} className="font-semibold">{p.name}</a>
            <br />
            {p.label}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
