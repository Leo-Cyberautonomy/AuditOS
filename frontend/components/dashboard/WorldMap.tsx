"use client";

/* ------------------------------------------------------------------ */
/*  SVG World Map with continent outlines (equirectangular projection) */
/*  viewBox: 0 0 1010 666                                             */
/* ------------------------------------------------------------------ */

const LAND_PATHS = [
  // North America (US, Canada, Mexico, Central America)
  "M 130,120 L 155,95 175,80 200,75 230,80 255,95 270,105 280,120 285,140 278,160 265,175 260,190 250,205 240,215 225,225 210,230 195,240 185,260 175,265 170,255 160,245 150,235 140,220 130,200 120,180 115,160 120,140 Z",
  // Greenland
  "M 295,55 L 310,45 330,42 345,48 350,60 345,75 335,85 320,88 305,80 295,68 Z",
  // South America
  "M 225,280 L 240,270 260,268 275,275 285,290 290,310 292,335 288,360 280,385 268,400 255,410 242,405 235,390 228,370 222,345 218,320 220,300 Z",
  // Europe (Western)
  "M 460,88 L 475,78 495,72 520,75 535,82 540,95 535,108 525,118 510,122 495,125 480,120 468,112 462,100 Z",
  // UK + Ireland
  "M 445,82 L 450,76 456,78 458,88 454,95 448,92 Z M 442,80 L 446,76 443,84 Z",
  // Scandinavia
  "M 490,48 L 498,38 510,35 518,42 515,58 508,68 500,72 492,65 488,55 Z",
  // Russia / Northern Asia
  "M 540,60 L 580,50 630,45 680,42 730,45 780,50 820,55 840,62 845,75 835,88 810,95 780,98 740,100 700,102 660,100 620,95 580,90 555,85 545,75 Z",
  // Africa
  "M 470,175 L 490,162 510,158 530,165 545,180 555,200 560,225 558,255 550,280 538,300 522,315 505,320 490,312 478,295 470,270 465,245 462,220 460,200 465,185 Z",
  // Middle East
  "M 545,120 L 565,115 580,120 590,132 585,148 575,158 560,162 548,155 542,140 540,128 Z",
  // India
  "M 620,145 L 638,138 650,145 655,162 652,180 645,195 635,205 625,200 618,185 615,168 616,155 Z",
  // China / East Asia
  "M 660,82 L 700,75 740,78 770,85 790,95 795,110 788,128 775,140 760,148 740,152 720,150 700,145 685,135 672,120 665,105 660,92 Z",
  // Southeast Asia
  "M 720,165 L 735,158 748,162 755,175 750,188 740,195 728,190 720,178 Z",
  // Japan
  "M 808,92 L 812,85 818,88 822,100 818,112 812,118 808,110 805,100 Z",
  // Korea
  "M 795,100 L 800,95 805,100 803,110 798,112 795,108 Z",
  // Indonesia
  "M 730,215 L 745,212 755,215 760,222 770,218 778,222 775,228 765,230 750,228 738,225 732,220 Z",
  // Australia
  "M 775,290 L 800,278 830,275 855,280 870,292 875,310 868,330 850,342 830,345 810,340 795,328 782,315 778,300 Z",
  // New Zealand
  "M 895,345 L 900,338 905,342 903,355 898,360 895,352 Z",
  // Madagascar
  "M 555,310 L 560,305 565,310 563,322 558,325 555,318 Z",
  // Sri Lanka
  "M 638,210 L 642,206 646,210 644,216 640,216 Z",
  // Taiwan
  "M 790,142 L 794,138 797,142 795,148 791,148 Z",
  // Philippines
  "M 785,168 L 790,162 795,165 793,175 788,178 785,173 Z",
  // Iceland
  "M 400,52 L 408,48 418,50 420,56 415,60 405,58 Z",
  // Alaska connection
  "M 100,75 L 115,65 130,68 140,78 138,90 128,95 115,92 105,85 Z",
  // Caribbean
  "M 210,220 L 218,218 225,222 228,228 222,232 215,228 Z",
];

/* Highlighted region paths (indices into LAND_PATHS) */
const US_INDICES = [0, 22]; // North America + Alaska
const EU_INDICES = [3, 5]; // Western Europe + Scandinavia
const UK_INDICES = [4]; // UK + Ireland
const JAPAN_INDICES = [12]; // Japan

/* Pulsing dot locations */
const PULSE_DOTS = [
  { cx: 200, cy: 160, color: "#3B82F6", label: "US - 16 stds", labelDx: 0, labelDy: -22 },
  { cx: 500, cy: 98, color: "#22C55E", label: "EU - 16 stds", labelDx: 0, labelDy: -22 },
  { cx: 450, cy: 84, color: "#22C55E", label: "UK - 3", labelDx: -30, labelDy: -4 },
  { cx: 815, cy: 100, color: "#F59E0B", label: "JP - 1", labelDx: 22, labelDy: -4 },
];

export default function WorldMap({ className }: { className?: string }) {
  return (
    <div
      className={`relative rounded-2xl overflow-hidden ${className ?? ""}`}
      style={{
        aspectRatio: "2 / 1",
        backgroundColor: "#FFFFFF",
        border: "1px solid #F3F4F6",
        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
      }}
    >
      <svg
        viewBox="0 0 1010 666"
        className="w-full h-full"
        style={{ display: "block" }}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Ocean background */}
        <rect width="1010" height="666" fill="#F8FAFC" />

        {/* Subtle grid lines */}
        <defs>
          <pattern
            id="map-grid"
            width="50.5"
            height="66.6"
            patternUnits="userSpaceOnUse"
          >
            <line x1="0" y1="0" x2="0" y2="66.6" stroke="#E2E8F0" strokeWidth="0.3" opacity="0.5" />
            <line x1="0" y1="0" x2="50.5" y2="0" stroke="#E2E8F0" strokeWidth="0.3" opacity="0.5" />
          </pattern>
        </defs>
        <rect width="1010" height="666" fill="url(#map-grid)" />

        {/* All land masses — base gray */}
        {LAND_PATHS.map((d, i) => (
          <path key={`land-${i}`} d={d} fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="0.5" />
        ))}

        {/* Highlighted regions — US (blue) */}
        {US_INDICES.map((idx) => (
          <path
            key={`us-${idx}`}
            d={LAND_PATHS[idx]}
            fill="#3B82F6"
            opacity={0.25}
            stroke="#3B82F6"
            strokeWidth="0.8"
            strokeOpacity={0.4}
          />
        ))}

        {/* Highlighted regions — EU (green) */}
        {EU_INDICES.map((idx) => (
          <path
            key={`eu-${idx}`}
            d={LAND_PATHS[idx]}
            fill="#22C55E"
            opacity={0.25}
            stroke="#22C55E"
            strokeWidth="0.8"
            strokeOpacity={0.4}
          />
        ))}

        {/* Highlighted regions — UK (green, brighter) */}
        {UK_INDICES.map((idx) => (
          <path
            key={`uk-${idx}`}
            d={LAND_PATHS[idx]}
            fill="#22C55E"
            opacity={0.35}
            stroke="#22C55E"
            strokeWidth="0.8"
            strokeOpacity={0.5}
          />
        ))}

        {/* Highlighted regions — Japan (amber) */}
        {JAPAN_INDICES.map((idx) => (
          <path
            key={`jp-${idx}`}
            d={LAND_PATHS[idx]}
            fill="#F59E0B"
            opacity={0.35}
            stroke="#F59E0B"
            strokeWidth="0.8"
            strokeOpacity={0.5}
          />
        ))}

        {/* Pulsing dots + labels */}
        {PULSE_DOTS.map((dot, i) => (
          <g key={`dot-${i}`}>
            {/* Pulsing outer ring */}
            <circle cx={dot.cx} cy={dot.cy} r="8" fill="none" stroke={dot.color} strokeWidth="1.5" opacity="0.3">
              <animate attributeName="r" values="6;18;6" dur="3s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.4;0.05;0.4" dur="3s" repeatCount="indefinite" />
            </circle>
            {/* Solid center dot */}
            <circle cx={dot.cx} cy={dot.cy} r="4" fill={dot.color} opacity="0.8" />
            <circle cx={dot.cx} cy={dot.cy} r="2" fill="#FFFFFF" opacity="0.9" />

            {/* Label pill */}
            <rect
              x={dot.cx + dot.labelDx - 34}
              y={dot.cy + dot.labelDy - 8}
              width="68"
              height="16"
              rx="8"
              fill="#FFFFFF"
              stroke={dot.color}
              strokeWidth="0.8"
              opacity="0.95"
            />
            <text
              x={dot.cx + dot.labelDx}
              y={dot.cy + dot.labelDy + 3.5}
              textAnchor="middle"
              fontSize="8"
              fontWeight="600"
              fill={dot.color}
              fontFamily="system-ui, -apple-system, sans-serif"
            >
              {dot.label}
            </text>
          </g>
        ))}

        {/* International / ISO label at bottom center */}
        <g>
          <rect
            x={505 - 48}
            y={600 - 10}
            width="96"
            height="20"
            rx="10"
            fill="#FFFFFF"
            stroke="#A855F7"
            strokeWidth="0.8"
            opacity="0.95"
          />
          <text
            x={505}
            y={614}
            textAnchor="middle"
            fontSize="9"
            fontWeight="600"
            fill="#A855F7"
            fontFamily="system-ui, -apple-system, sans-serif"
          >
            {"ISO Int'l - 19 stds"}
          </text>
        </g>
      </svg>
    </div>
  );
}
