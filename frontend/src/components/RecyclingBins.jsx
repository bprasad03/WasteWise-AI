import React from 'react';
import { motion } from 'framer-motion';
import {
  Package,
  Wine,
  Hammer,
  FileText,
  Milk,
  Trash2,
  CheckCircle2,
} from 'lucide-react';

export const RECYCLING_BINS_DATA = [
  {
    id: 'cardboard',
    name: 'Cardboard',
    binName: 'Paper & Cardboard Bin',
    colorName: 'Amber / Orange',
    bgLight: 'bg-amber-50/70',
    borderLight: 'border-amber-200/80',
    borderActive: 'border-amber-500 ring-2 ring-amber-300',
    textDark: 'text-amber-950',
    badgeBg: 'bg-amber-100 text-amber-900 border border-amber-300',
    accentColor: '#d97706',
    icon: Package,
    summary: 'Corrugated boxes, packaging cartons',
  },
  {
    id: 'glass',
    name: 'Glass',
    binName: 'Glass Container Bin',
    colorName: 'Green / Bottle Bank',
    bgLight: 'bg-emerald-50/70',
    borderLight: 'border-emerald-200/80',
    borderActive: 'border-emerald-500 ring-2 ring-emerald-300',
    textDark: 'text-emerald-950',
    badgeBg: 'bg-emerald-100 text-emerald-900 border border-emerald-300',
    accentColor: '#059669',
    icon: Wine,
    summary: 'Beverage bottles, glass jars',
  },
  {
    id: 'metal',
    name: 'Metal',
    binName: 'Metals & Cans Bin',
    colorName: 'Royal Blue',
    bgLight: 'bg-blue-50/70',
    borderLight: 'border-blue-200/80',
    borderActive: 'border-blue-500 ring-2 ring-blue-300',
    textDark: 'text-blue-950',
    badgeBg: 'bg-blue-100 text-blue-900 border border-blue-300',
    accentColor: '#2563eb',
    icon: Hammer,
    summary: 'Soda cans, food tins, clean foil',
  },
  {
    id: 'paper',
    name: 'Paper',
    binName: 'Paper Recycling Bin',
    colorName: 'Sky Blue',
    bgLight: 'bg-sky-50/70',
    borderLight: 'border-sky-200/80',
    borderActive: 'border-sky-500 ring-2 ring-sky-300',
    textDark: 'text-sky-950',
    badgeBg: 'bg-sky-100 text-sky-900 border border-sky-300',
    accentColor: '#0284c7',
    icon: FileText,
    summary: 'Office paper, magazines, catalogs',
  },
  {
    id: 'plastic',
    name: 'Plastic',
    binName: 'Plastics & Bottles Bin',
    colorName: 'Bright Yellow',
    bgLight: 'bg-yellow-50/70',
    borderLight: 'border-yellow-200/80',
    borderActive: 'border-yellow-500 ring-2 ring-yellow-300',
    textDark: 'text-yellow-950',
    badgeBg: 'bg-yellow-100 text-yellow-900 border border-yellow-300',
    accentColor: '#ca8a04',
    icon: Milk,
    summary: '#1 PET & #2 HDPE bottles, jugs, tubs',
  },
  {
    id: 'trash',
    name: 'Trash',
    binName: 'General Waste Bin',
    colorName: 'Charcoal Gray',
    bgLight: 'bg-slate-100/70',
    borderLight: 'border-slate-300/80',
    borderActive: 'border-slate-700 ring-2 ring-slate-400',
    textDark: 'text-slate-950',
    badgeBg: 'bg-slate-200 text-slate-800 border border-slate-400',
    accentColor: '#475569',
    icon: Trash2,
    summary: 'Non-recyclables, soiled items, landfill',
  },
];

/**
 * Handcrafted Pixel Art SVG Bin Graphic
 * Matches the reference image's color, proportion, stepped lid, and central icon.
 */
function PixelArtBin({ id, color, isHighlighted }) {
  // Shading colors per bin
  const colorMap = {
    cardboard: { fill: '#d97706', highlight: '#f59e0b', shadow: '#b45309', border: '#78350f' },
    glass: { fill: '#10b981', highlight: '#34d399', shadow: '#059669', border: '#064e3b' },
    metal: { fill: '#2563eb', highlight: '#60a5fa', shadow: '#1d4ed8', border: '#1e3a8a' },
    paper: { fill: '#0284c7', highlight: '#38bdf8', shadow: '#0369a1', border: '#0c4a6e' },
    plastic: { fill: '#eab308', highlight: '#fde047', shadow: '#ca8a04', border: '#713f12' },
    trash: { fill: '#475569', highlight: '#64748b', shadow: '#334155', border: '#0f172a' },
  };

  const scheme = colorMap[id] || colorMap.trash;

  return (
    <div className="relative w-16 h-20 sm:w-18 sm:h-22 flex items-center justify-center">
      <svg
        viewBox="0 0 64 80"
        className="w-full h-full drop-shadow-xs"
        style={{ shapeRendering: 'crispEdges' }}
      >
        {/* Wheels */}
        <rect x="12" y="66" width="8" height="8" rx="2" fill="#0f172a" />
        <rect x="14" y="68" width="4" height="4" fill="#94a3b8" />
        <rect x="44" y="66" width="8" height="8" rx="2" fill="#0f172a" />
        <rect x="46" y="68" width="4" height="4" fill="#94a3b8" />

        {/* Bin Body Base Shadow */}
        <polygon points="14,68 50,68 47,72 17,72" fill="#0f172a" />

        {/* Bin Body - Main Barrel */}
        {/* Outer dark border */}
        <polygon points="12,22 52,22 48,68 16,68" fill={scheme.border} />
        {/* Inner fill */}
        <polygon points="14,24 50,24 46,66 18,66" fill={scheme.fill} />
        {/* Left highlight strip */}
        <polygon points="14,24 22,24 21,66 18,66" fill={scheme.highlight} />
        {/* Right shadow strip */}
        <polygon points="43,24 50,24 46,66 42,66" fill={scheme.shadow} />

        {/* Horizontal Rib Lines */}
        <rect x="17" y="32" width="30" height="2" fill={scheme.shadow} opacity="0.6" />
        <rect x="17" y="30" width="30" height="1" fill={scheme.highlight} opacity="0.6" />
        <rect x="19" y="58" width="26" height="2" fill={scheme.shadow} opacity="0.6" />

        {/* Central White Pixel Art Icon */}
        <g fill="#ffffff">
          {id === 'cardboard' && (
            /* 3D Isometric Pixel Box */
            <g>
              <polygon points="32,38 43,43 32,48 21,43" fill="#ffffff" />
              <polygon points="21,44 32,49 32,58 21,53" fill="#e2e8f0" />
              <polygon points="32,49 43,44 43,53 32,58" fill="#cbd5e1" />
              <polygon points="32,40 37,42.5 32,45 27,42.5" fill="#f8fafc" />
            </g>
          )}

          {id === 'glass' && (
            /* Pixel Bottle */
            <g>
              <rect x="30" y="38" width="4" height="4" />
              <rect x="29" y="42" width="6" height="2" />
              <rect x="26" y="44" width="12" height="14" rx="2" />
              <rect x="28" y="47" width="2" height="8" fill="#e2e8f0" />
            </g>
          )}

          {id === 'metal' && (
            /* Pixel Tin/Beverage Can */
            <g>
              <rect x="27" y="38" width="10" height="3" rx="1" fill="#f8fafc" />
              <rect x="26" y="41" width="12" height="17" rx="1" />
              <rect x="28" y="43" width="2" height="13" fill="#e2e8f0" />
              <rect x="31" y="45" width="4" height="8" fill="#cbd5e1" />
            </g>
          )}

          {id === 'paper' && (
            /* Pixel Document with folded dog-ear */
            <g>
              <polygon points="26,38 35,38 40,43 40,58 26,58" />
              <polygon points="35,38 35,43 40,43" fill="#cbd5e1" />
              <rect x="29" y="45" width="8" height="1.5" fill="#64748b" />
              <rect x="29" y="49" width="8" height="1.5" fill="#64748b" />
              <rect x="29" y="53" width="5" height="1.5" fill="#64748b" />
            </g>
          )}

          {id === 'plastic' && (
            /* Pixel Plastic Jug/Bottle */
            <g>
              <rect x="30" y="38" width="4" height="3" fill="#f8fafc" />
              <polygon points="27,41 37,41 39,46 39,58 25,58 25,46" />
              <rect x="27" y="47" width="2" height="8" fill="#e2e8f0" />
            </g>
          )}

          {id === 'trash' && (
            /* Pixel Trash Can Icon */
            <g>
              <rect x="26" y="39" width="12" height="2" rx="1" />
              <rect x="29" y="37" width="6" height="2" />
              <polygon points="27,42 37,42 36,58 28,58" />
              <rect x="31" y="45" width="2" height="9" fill="#0f172a" />
            </g>
          )}
        </g>

        {/* Animated Pixel Lid */}
        <g
          style={{
            transformOrigin: '10px 20px',
            transform: isHighlighted ? 'rotate(-16deg) translate(-2px, -4px)' : 'none',
            transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          {/* Top Handle */}
          <rect x="28" y="8" width="8" height="4" rx="1" fill="#0f172a" />
          <rect x="30" y="9" width="4" height="2" fill={scheme.highlight} />

          {/* Stepped Lid Crown */}
          <rect x="14" y="12" width="36" height="4" fill={scheme.border} />
          <rect x="16" y="13" width="32" height="3" fill={scheme.fill} />
          <rect x="16" y="13" width="6" height="3" fill={scheme.highlight} />

          {/* Lid Overhang Rim */}
          <rect x="8" y="16" width="48" height="6" rx="1" fill={scheme.border} />
          <rect x="10" y="17" width="44" height="4" fill={scheme.fill} />
          <rect x="10" y="17" width="8" height="4" fill={scheme.highlight} />
          <rect x="44" y="17" width="10" height="4" fill={scheme.shadow} />
        </g>
      </svg>
    </div>
  );
}

export default function RecyclingBins({
  activeCategory = null,
  onSelectBin = () => {},
  selectedBin = null,
}) {
  return (
    <div className="w-full flex items-center justify-center">
      <div className="flex flex-wrap items-end justify-center gap-3 sm:gap-4 md:gap-5 lg:gap-6 py-2">
        {RECYCLING_BINS_DATA.map((bin) => {
          const isPredicted = activeCategory?.toLowerCase() === bin.id;
          const isUserSelected = selectedBin === bin.id;
          const isHighlighted = isPredicted || isUserSelected;

          return (
            <motion.div
              key={bin.id}
              onClick={() => onSelectBin(bin.id)}
              whileHover={{ y: -4, transition: { duration: 0.15 } }}
              className={`cursor-pointer relative flex flex-col items-center select-none transition-all duration-200 group p-1.5 rounded-xl ${
                isHighlighted
                  ? 'scale-105 filter drop-shadow-[0_4px_12px_rgba(34,197,94,0.35)]'
                  : 'hover:opacity-95'
              }`}
            >
              {/* Highlight MATCH Badge */}
              {isPredicted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#16a34a] text-white text-[10px] font-pixel font-bold px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1 whitespace-nowrap z-30 border border-white">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  MATCH
                </div>
              )}

              {/* Pixel Art Bin */}
              <PixelArtBin
                id={bin.id}
                color={bin.accentColor}
                isHighlighted={isHighlighted}
              />

              {/* Category Pill Button below bin */}
              <div
                className={`mt-1.5 px-3 py-0.5 rounded-md text-xs font-pixel font-bold transition-all border ${
                  isHighlighted
                    ? 'bg-white text-[#0f172a] border-[#16a34a] shadow-[0_2px_0_0_#16a34a] scale-105'
                    : 'bg-white text-[#0f172a] border-slate-300 shadow-[0_1px_2px_rgba(0,0,0,0.08)] group-hover:border-slate-400'
                }`}
              >
                {bin.name}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

