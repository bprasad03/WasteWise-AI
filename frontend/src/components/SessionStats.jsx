import React, { useState } from 'react';
import {
  BarChart3,
  Recycle,
  Trash2,
  AlertTriangle,
  History,
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
        className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${
          binStyle?.borderLight || 'border-slate-200'
        } ${binStyle?.bgLight || 'bg-slate-100'}`}
        title={`${item.predicted_class} stream`}
      >
        <Icon className="w-4 h-4" style={{ color: binStyle?.accentColor || '#64748b' }} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={item.predicted_class || 'Scanned item'}
      onError={() => setHasError(true)}
      className="w-10 h-10 rounded-lg object-cover bg-slate-100 border border-slate-200 shrink-0"
      loading="lazy"
    />
  );
}

export default function SessionStats({
  history = [],
  onSelectHistoryItem = () => {},
}) {
  const totalScans = history.length;
  const recyclableCount = history.filter(
    (item) => item.predicted_class?.toLowerCase() !== 'trash'
  ).length;
  const trashCount = history.filter(
    (item) => item.predicted_class?.toLowerCase() === 'trash'
  ).length;
  const lowConfidenceCount = history.filter(
    (item) => item.confidence < 0.6
  ).length;

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-xs border border-slate-200/90 space-y-5 sm:space-y-6">
      {/* Title & Clear Session Context */}
      <div>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>Session Classification Activity</span>
          </h2>
          <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full whitespace-nowrap">
            Client Session Only
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
          Real-time browser session counts. <strong>Notice:</strong> These metrics reflect user interaction events in this browser session and do not constitute physical waste disposal or municipal audits.
        </p>
      </div>

      {/* Modern Session Metric Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500">Total Scanned</div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">{totalScans}</div>
          <div className="text-[10px] text-slate-400 mt-0.5 truncate">Session queries</div>
        </div>

        <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/70 shadow-2xs">
          <div className="text-[11px] font-semibold text-emerald-800 flex items-center gap-1">
            <Recycle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Recyclable</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-900 mt-0.5">{recyclableCount}</div>
          <div className="text-[10px] text-emerald-700/80 mt-0.5 truncate">5 recyclable streams</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-100/70 border border-slate-300/80 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
            <Trash2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>Trash Stream</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-800 mt-0.5">{trashCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5 truncate">General landfill</div>
        </div>

        <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/80 shadow-2xs">
          <div className="text-[11px] font-semibold text-amber-800 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Low Confidence</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-900 mt-0.5">{lowConfidenceCount}</div>
          <div className="text-[10px] text-amber-700/80 mt-0.5 truncate">&lt; 60% probability</div>
        </div>
      </div>

      {/* Recent Classifications History */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
            <History className="w-4 h-4 text-slate-500" />
            <span>Recent Session History</span>
          </h3>
          <span className="text-[11px] text-slate-400">
            {history.length > 0 ? `${history.length} item(s)` : 'No scans yet'}
          </span>
        </div>

        {history.length === 0 ? (
          <div className="text-center py-7 px-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
            <Clock className="w-7 h-7 text-slate-300 mx-auto mb-1.5" />
            <p className="text-xs text-slate-500 font-medium">
              No items classified in this session yet. Upload a photo above to start!
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-56 sm:max-h-60 overflow-y-auto pr-1">
            {history.map((item, idx) => {
              const binStyle =
                RECYCLING_BINS_DATA.find(
                  (b) => b.id === item.predicted_class?.toLowerCase()
                ) || RECYCLING_BINS_DATA[5];

              return (
                <div
                  key={idx}
                  onClick={() => onSelectHistoryItem(item)}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    {/* Thumbnail preview with fallback */}
                    <HistoryThumbnail item={item} binStyle={binStyle} />

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 capitalize truncate">
                          {item.predicted_class}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${binStyle.badgeBg}`}
                        >
                          {(item.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[160px] sm:max-w-[240px]">
                        {item.filename || 'Uploaded image'}
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] text-slate-400 shrink-0 pl-2 whitespace-nowrap">
                    {item.timestamp || 'Just now'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
