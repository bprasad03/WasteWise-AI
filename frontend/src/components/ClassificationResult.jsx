import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  ListChecks,
  Sparkles,
} from 'lucide-react';
import { RECYCLING_BINS_DATA } from './RecyclingBins';

export default function ClassificationResult({ result }) {
  if (!result) return null;

  const {
    predicted_class,
    confidence,
    probabilities = [],
    guidance,
    filename,
  } = result;

  const confidencePercent = (confidence * 100).toFixed(1);
  const isLowConfidence = confidence < 0.6;

  // Find matching visual styling for predicted class
  const binStyle =
    RECYCLING_BINS_DATA.find((b) => b.id === predicted_class?.toLowerCase()) ||
    RECYCLING_BINS_DATA[5]; // fallback to trash

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-xs border border-slate-200/90 space-y-5 sm:space-y-6">
      {/* Header with predicted category & confidence */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-5">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            CNN Inference Classification
          </span>
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 mt-1">
            <h2 className="text-2xl sm:text-3xl font-extrabold capitalize text-slate-900 tracking-tight">
              {predicted_class}
            </h2>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border shadow-2xs ${binStyle.badgeBg}`}
            >
              {guidance?.bin_name || `${predicted_class} stream`}
            </span>
          </div>
        </div>

        {/* Confidence meter badge with clear probability messaging */}
        <div className="flex items-center gap-2.5 self-stretch sm:self-auto justify-between sm:justify-end bg-slate-50/90 px-3.5 py-2.5 rounded-xl border border-slate-200">
          <div className="text-left sm:text-right">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Estimated Probability
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
              {confidencePercent}%
            </div>
            <div className="text-[10px] text-slate-400 font-medium">
              Statistical model output
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center font-bold text-xs shrink-0">
            <Sparkles className="w-5 h-5 text-emerald-600" />
          </div>
        </div>
      </div>

      {/* Probability Disclaimer Note */}
      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-600 text-xs flex items-start gap-2.5 leading-relaxed">
        <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        <p>
          <strong>Probability Notice:</strong> The confidence score is the model's estimated probability based on image patterns, <strong>not guaranteed correctness</strong>. Item condition, cleanliness, and local sorting rules determine actual recyclability.
        </p>
      </div>

      {/* Caution Alert when confidence is below 60% */}
      {isLowConfidence && (
        <div className="p-4 rounded-xl bg-amber-50/90 border border-amber-300 text-amber-900 flex items-start gap-3 shadow-2xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <span>Notice: Moderate Confidence ({confidencePercent}%)</span>
            </div>
            <p className="text-amber-800 leading-relaxed text-xs">
              The neural network detected visual ambiguity, mixed packaging materials, or multiple waste categories.
              Predictions are provided solely as AI guidance and are <strong>never guaranteed</strong>. Please inspect the item packaging carefully before sorting.
            </p>
          </div>
        </div>
      )}

      {/* Class Probabilities Distribution */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
            All 6 Category Probabilities
          </h3>
          <span className="text-[11px] text-slate-400">Softmax Distribution</span>
        </div>

        <div className="space-y-2.5">
          {probabilities.map((item) => {
            const pct = (item.probability * 100).toFixed(1);
            const isTop = item.class_name.toLowerCase() === predicted_class?.toLowerCase();
            const classBin = RECYCLING_BINS_DATA.find((b) => b.id === item.class_name.toLowerCase());

            return (
              <div key={item.class_id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: classBin?.accentColor || '#64748b' }}
                    />
                    <span
                      className={`capitalize truncate ${
                        isTop ? 'font-bold text-slate-900' : 'font-medium text-slate-600'
                      }`}
                    >
                      {item.class_name}
                    </span>
                    {isTop && (
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded whitespace-nowrap">
                        Top Class
                      </span>
                    )}
                  </div>
                  <span className={`font-mono text-xs shrink-0 pl-2 ${isTop ? 'font-bold text-slate-900' : 'text-slate-500'}`}>
                    {pct}%
                  </span>
                </div>
                {/* Horizontal progress bar with smooth transition */}
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: isTop ? classBin?.accentColor || '#16a34a' : '#cbd5e1',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Structured Recycling Guidance Card */}
      {guidance && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
            <div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Recommended Disposal Stream
              </div>
              <h4 className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
                {guidance.bin_name}
              </h4>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 shadow-2xs self-start">
              Color: {guidance.bin_color}
            </span>
          </div>

          {/* Step-by-step preparation checklist */}
          {guidance.instructions && guidance.instructions.length > 0 && (
            <div>
              <div className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                <ListChecks className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Preparation & Sorting Checklist:</span>
              </div>
              <ul className="space-y-1.5 text-xs sm:text-sm text-slate-700">
                {guidance.instructions.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Municipal disclaimer notice */}
          {guidance.disclaimer && (
            <div className="pt-3 border-t border-slate-200 text-[11px] text-slate-500 flex items-start gap-2 leading-relaxed">
              <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <span>{guidance.disclaimer}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
