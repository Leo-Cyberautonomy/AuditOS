"use client";

import React, { memo } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
} from "react-simple-maps";

const GEO_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

/* ── Region → Country ISO numeric codes ───────────────────────────── */

const US_CODES = new Set(["840"]);
const EU_CODES = new Set([
  "040", "056", "100", "191", "196", "203", "208", "233", "246", "250",
  "276", "300", "348", "372", "380", "428", "440", "442", "470", "528",
  "616", "620", "642", "703", "705", "724", "752",
]);
const UK_CODES = new Set(["826"]);
const JP_CODES = new Set(["392"]);

function getRegionColor(id: string): string | null {
  if (US_CODES.has(id)) return "#3B82F6";
  if (EU_CODES.has(id)) return "#22C55E";
  if (UK_CODES.has(id)) return "#22C55E";
  if (JP_CODES.has(id)) return "#F59E0B";
  return null;
}

/* ── Markers ─────────────────────────────────────────────────────── */

const MARKERS = [
  { name: "US", count: 16, coords: [-98, 38] as [number, number], color: "#3B82F6" },
  { name: "EU", count: 16, coords: [10, 50] as [number, number], color: "#22C55E" },
  { name: "UK", count: 3, coords: [-3, 57] as [number, number], color: "#16A34A" },
  { name: "JP", count: 1, coords: [138, 36] as [number, number], color: "#F59E0B" },
];

/* ── Component ────────────────────────────────────────────────────── */

function WorldMapInner({ className }: { className?: string }) {
  return (
    <div
      className={className}
      style={{
        backgroundColor: "#F8FAFC",
        borderRadius: 12,
        border: "1px solid #E2E8F0",
        overflow: "hidden",
      }}
    >
      <ComposableMap
        projectionConfig={{ scale: 180, center: [10, 5] }}
        width={1010}
        height={500}
        style={{ width: "100%", height: "auto" }}
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const rc = getRegionColor(geo.id);
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={rc ?? "#E2E8F0"}
                  fillOpacity={rc ? 0.4 : 1}
                  stroke="#CBD5E1"
                  strokeWidth={0.5}
                  style={{
                    default: { outline: "none" },
                    hover: {
                      fill: rc ?? "#CBD5E1",
                      fillOpacity: rc ? 0.6 : 1,
                      outline: "none",
                    },
                    pressed: { outline: "none" },
                  }}
                />
              );
            })
          }
        </Geographies>

        {MARKERS.map((m) => (
          <Marker key={m.name} coordinates={m.coords}>
            <circle r={8} fill={m.color} opacity={0.15}>
              <animate attributeName="r" from="6" to="16" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" from="0.25" to="0" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle r={4} fill={m.color} stroke="#fff" strokeWidth={1.5} />
            <text
              textAnchor="middle"
              y={-12}
              style={{ fontSize: 9, fontWeight: 700, fill: m.color, fontFamily: "system-ui" }}
            >
              {m.name} · {m.count} stds
            </text>
          </Marker>
        ))}

        <Marker coordinates={[10, -45]}>
          <text
            textAnchor="middle"
            style={{ fontSize: 9, fontWeight: 600, fill: "#6366F1", fontFamily: "system-ui" }}
          >
            ISO International · 19 standards apply globally
          </text>
        </Marker>
      </ComposableMap>
    </div>
  );
}

const WorldMap = memo(WorldMapInner);
export default WorldMap;
