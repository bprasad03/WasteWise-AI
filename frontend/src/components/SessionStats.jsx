import React, { useState } from 'react';
import {
  BarChart3,
  Recycle,
  Trash2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { RECYCLING_BINS_DATA } from './RecyclingBins';

/**
 * Thumbnail component with graceful fallback to category icon
 * if image data fails to load or is invalid.
 */
function HistoryThumbnail({ item, binStyle }) {
  const [hasError, setHasError] = useState(false);
  const src = item.thumbnailUrl || item.previewUrl;
  const Icon = binStyle?.icon || Sparkles;

  if (!src || hasError) {
    return (
      <div
        className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 border ${
          binStyle?.borderLight || 'border-slate-200'
        } ${binStyle?.bgLight || 'bg-slate-100'}`}
        title={`${item.predicted_class} stream`}
      >
        <Icon className="w-5 h-5" style={{ color: binStyle?.accentColor || '#64748b' }} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={item.predicted_class || 'Scanned item'}
      onError={() => setHasError(true)}
      className="w-11 h-11 rounded-lg object-cover bg-slate-100 border border-slate-200 shrink-0"
      loading="lazy"
    />
  );
}

/**
 * Left Bottom Card: Session Activity
 */
export function SessionActivityCard({ history = [] }) {
  const totalScans = history.length;
  const recyclableCount = history.filter(
    (item) => item.predicted_class?.toLowerCase() !== 'trash'
  ).length;
  const trashCount = history.filter(
    (item) => item.predicted_class?.toLowerCase() === 'trash'
  ).length;

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 border-2 border-[#bbf7d0] shadow-[0_2px_0_0_#bbf7d0] h-full flex flex-col justify-between">
      <div>
        {/* Header matching reference */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-[#22c55e] border border-[#15803d] flex items-center justify-center text-white shrink-0 shadow-2xs">
              <BarChart3 className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold font-pixel text-[#0f172a] leading-tight">
              Session Activity
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-sans">
            This Browser Session
          </span>
        </div>

        {/* 3 Stat Boxes side-by-side matching reference image */}
        <div className="grid grid-cols-3 gap-3">
          {/* Scanned */}
          <div className="p-3.5 rounded-xl bg-[#f0f9ff] border border-[#bae6fd] text-center shadow-2xs">
            <div className="font-pixel text-2xl sm:text-3xl font-bold text-[#0284c7] leading-none">
              {totalScans}
            </div>
            <div className="text-xs font-semibold text-[#0369a1] font-sans mt-1">
              Scanned
            </div>
          </div>

          {/* Recyclable */}
          <div className="p-3.5 rounded-xl bg-[#f0fdf4] border border-[#bbf7d0] text-center shadow-2xs">
            <div className="font-pixel text-2xl sm:text-3xl font-bold text-[#16a34a] leading-none">
              {recyclableCount}
            </div>
            <div className="text-xs font-semibold text-[#15803d] font-sans mt-1">
              Recyclable
            </div>
          </div>

          {/* Trash */}
          <div className="p-3.5 rounded-xl bg-[#fef2f2] border border-[#fecaca] text-center shadow-2xs">
            <div className="font-pixel text-2xl sm:text-3xl font-bold text-[#dc2626] leading-none">
              {trashCount}
            </div>
            <div className="text-xs font-semibold text-[#b91c1c] font-sans mt-1">
              Trash
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-[#d1fae5] text-[11px] text-slate-400 font-sans leading-relaxed">
        Client session counts only. Does not represent physical waste collection.
      </div>
    </div>
  );
}

/**
 * Right Bottom Card: Recent Classification History
 */
export function RecentHistoryCard({
  history = [],
  onSelectHistoryItem = () => {},
}) {
  const [showAll, setShowAll] = useState(false);
  const displayItems = showAll ? history : history.slice(0, 4);

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 border-2 border-[#bbf7d0] shadow-[0_2px_0_0_#bbf7d0] h-full flex flex-col justify-between">
      <div>
        {/* Header matching reference */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-[#22c55e] border border-[#15803d] flex items-center justify-center text-white shrink-0 shadow-2xs">
              <Clock className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold font-pixel text-[#0f172a] leading-tight">
              Recent Classification History
            </h2>
          </div>
          {history.length > 4 && (
            <button
              type="button"
              onClick={() => setShowAll(!showAll)}
              className="text-xs font-sans px-2.5 py-1 rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
            >
              {showAll ? 'Show Less' : 'View All'}
            </button>
          )}
        </div>

        {/* History items row matching reference */}
        {history.length === 0 ? (
          <div className="text-center py-7 px-4 rounded-xl border border-dashed border-[#bbf7d0] bg-[#f0fdf4]/30">
            <Clock className="w-6 h-6 text-slate-300 mx-auto mb-1" />
            <p className="text-xs text-slate-500 font-sans">
              No items classified yet in this session.
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap sm:flex-nowrap gap-3 overflow-x-auto pb-1">
            {displayItems.map((item, idx) => {
              const binStyle =
                RECYCLING_BINS_DATA.find(
                  (b) => b.id === item.predicted_class?.toLowerCase()
                ) || RECYCLING_BINS_DATA[5];

              return (
                <div
                  key={idx}
                  onClick={() => onSelectHistoryItem(item)}
                  className="bg-[#f8fafc] border border-slate-200/90 hover:border-[#86efac] rounded-xl p-2.5 flex items-center gap-2.5 shrink-0 min-w-[150px] sm:min-w-[170px] shadow-2xs transition-all cursor-pointer group"
                >
                  <HistoryThumbnail item={item} binStyle={binStyle} />

                  <div className="min-w-0">
                    <div className="font-bold text-xs text-[#0f172a] capitalize truncate">
                      {item.predicted_class}
                    </div>
                    <div className="mt-0.5">
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${binStyle.badgeBg}`}>
                        {(item.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-sans mt-0.5">
                      {item.timestamp || 'Just now'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-[#d1fae5] text-[11px] text-slate-400 font-sans">
        Click any historical card to view its complete prediction breakdown.
      </div>
    </div>
  );
}

export default function SessionStats({
  history = [],
  onSelectHistoryItem = () => {},
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
      <div className="lg:col-span-5">
        <SessionActivityCard history={history} />
      </div>
      <div className="lg:col-span-7">
        <RecentHistoryCard
          history={history}
          onSelectHistoryItem={onSelectHistoryItem}
        />
      </div>
    </div>
  );
}

