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
  Sparkles,
} from 'lucide-react';

export const RECYCLING_BINS_DATA = [
  {
    id: 'cardboard',
    name: 'Cardboard',
    binName: 'Paper & Cardboard Bin',
    colorName: 'Amber / Blue',
    bgLight: 'bg-amber-50/70',
    borderLight: 'border-amber-200/80',
    borderActive: 'border-amber-500 ring-2 ring-amber-200/80 shadow-md',
    textDark: 'text-amber-950',
    badgeBg: 'bg-amber-100 text-amber-800 border border-amber-200',
    accentColor: '#d97706',
    icon: Package,
    summary: 'Corrugated boxes, cereal cartons, packaging',
  },
  {
    id: 'glass',
    name: 'Glass',
    binName: 'Glass Container Bin',
    colorName: 'Green / Bottle Bank',
    bgLight: 'bg-teal-50/70',
    borderLight: 'border-teal-200/80',
    borderActive: 'border-teal-500 ring-2 ring-teal-200/80 shadow-md',
    textDark: 'text-teal-950',
    badgeBg: 'bg-teal-100 text-teal-800 border border-teal-200',
    accentColor: '#0d9488',
    icon: Wine,
    summary: 'Beverage bottles, condiment & sauce jars',
  },
  {
    id: 'metal',
    name: 'Metal',
    binName: 'Metals & Cans Bin',
    colorName: 'Royal Blue',
    bgLight: 'bg-blue-50/70',
    borderLight: 'border-blue-200/80',
    borderActive: 'border-blue-500 ring-2 ring-blue-200/80 shadow-md',
    textDark: 'text-blue-950',
    badgeBg: 'bg-blue-100 text-blue-800 border border-blue-200',
    accentColor: '#2563eb',
    icon: Hammer,
    summary: 'Soda cans, food tins, clean aluminum foil',
  },
  {
    id: 'paper',
    name: 'Paper',
    binName: 'Paper Recycling Bin',
    colorName: 'Sky Blue',
    bgLight: 'bg-sky-50/70',
    borderLight: 'border-sky-200/80',
    borderActive: 'border-sky-500 ring-2 ring-sky-200/80 shadow-md',
    textDark: 'text-sky-950',
    badgeBg: 'bg-sky-100 text-sky-800 border border-sky-200',
    accentColor: '#0284c7',
    icon: FileText,
    summary: 'Office paper, newspapers, magazines',
  },
  {
    id: 'plastic',
    name: 'Plastic',
    binName: 'Plastics & Bottles Bin',
    colorName: 'Yellow / Commingled',
    bgLight: 'bg-yellow-50/70',
    borderLight: 'border-yellow-200/80',
    borderActive: 'border-yellow-500 ring-2 ring-yellow-200/80 shadow-md',
    textDark: 'text-yellow-950',
    badgeBg: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
    accentColor: '#ca8a04',
    icon: Milk,
    summary: '#1 PET & #2 HDPE bottles, jugs, tubs',
  },
  {
    id: 'trash',
    name: 'Trash',
    binName: 'General Waste Bin',
    colorName: 'Dark Gray',
    bgLight: 'bg-slate-100/70',
    borderLight: 'border-slate-300/80',
    borderActive: 'border-slate-700 ring-2 ring-slate-300 shadow-md',
    textDark: 'text-slate-950',
    badgeBg: 'bg-slate-200 text-slate-800 border border-slate-300',
    accentColor: '#475569',
    icon: Trash2,
    summary: 'Non-recyclables, soiled items, landfill',
  },
];

export default function RecyclingBins({
  activeCategory = null,
  onSelectBin = () => {},
  selectedBin = null,
}) {
  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3.5 gap-2">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex flex-wrap items-center gap-2">
            <span>Recycling Streams</span>
            {activeCategory && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                Predicted: {activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1)}
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Select a waste stream to view standard guidelines. Successful predictions highlight the matching bin.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {RECYCLING_BINS_DATA.map((bin) => {
          const isPredicted = activeCategory?.toLowerCase() === bin.id;
          const isUserSelected = selectedBin === bin.id;
          const isHighlighted = isPredicted || isUserSelected;
          const Icon = bin.icon;

          return (
            <motion.div
              key={bin.id}
              onClick={() => onSelectBin(bin.id)}
              whileHover={{ y: -3, transition: { duration: 0.15 } }}
              className={`cursor-pointer relative rounded-2xl p-3 sm:p-4 transition-all duration-200 flex flex-col items-center text-center select-none border ${
                bin.bgLight
              } ${
                isHighlighted
                  ? 'border-emerald-500 ring-2 ring-emerald-100 bg-white shadow-md'
                  : 'border-slate-200/90 hover:border-slate-300 bg-white shadow-2xs hover:shadow-xs'
              }`}
            >
              {/* Highlight Badge */}
              {isPredicted && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-xs flex items-center gap-1 whitespace-nowrap z-20">
                  <CheckCircle2 className="w-3 h-3" />
                  MATCH
                </div>
              )}

              {/* Clean Modern Recycling Bin Graphic */}
              <div className="w-16 h-20 sm:w-18 sm:h-22 relative flex items-center justify-center my-1.5">
                {/* Bin Lid */}
                <motion.div
                  animate={
                    isHighlighted
                      ? { rotate: -20, y: -5, x: -2 }
                      : { rotate: 0, y: 0, x: 0 }
                  }
                  transition={{ type: 'spring', stiffness: 350, damping: 22 }}
                  className="absolute top-1 left-2 sm:left-2.5 right-2 sm:right-2.5 h-3 rounded-t-md z-10 flex items-center justify-center shadow-xs"
                  style={{
                    backgroundColor: bin.accentColor,
                    transformOrigin: 'top left',
                  }}
                >
                  {/* Subtle handle */}
                  <div className="w-3.5 h-1 bg-white/40 rounded-full mx-auto" />
                </motion.div>

                {/* Bin Body */}
                <div
                  className="w-12 sm:w-14 h-13 sm:h-15 rounded-b-xl relative flex flex-col items-center justify-center shadow-inner overflow-hidden border border-black/10"
                  style={{ backgroundColor: bin.accentColor }}
                >
                  {/* Modern rib lines */}
                  <div className="absolute inset-x-2 top-2 h-0.5 bg-white/20 rounded-full" />
                  <div className="absolute inset-x-2 top-5 h-0.5 bg-white/20 rounded-full" />
                  <div className="absolute inset-x-2 top-8 h-0.5 bg-white/20 rounded-full" />

                  {/* Centered stream icon */}
                  <div className="relative z-10 text-white drop-shadow-xs">
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>

                  {/* Bin wheel accents */}
                  <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-slate-800 rounded-full border border-slate-600" />
                  <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-slate-800 rounded-full border border-slate-600" />
                </div>
              </div>

              {/* Title & Stream Details */}
              <h3 className="font-bold text-xs sm:text-sm text-slate-900 mt-1 capitalize truncate w-full">
                {bin.name}
              </h3>
              <span
                className={`text-[10px] font-medium px-2 py-0.5 rounded-md mt-1 truncate max-w-full block ${bin.badgeBg}`}
              >
                {bin.colorName}
              </span>
              <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-tight">
                {bin.summary}
              </p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
