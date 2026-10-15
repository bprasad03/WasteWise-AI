import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  Recycle,
  Package,
  Trash2,
  Sparkles,
  BarChart3,
  Lightbulb,
} from 'lucide-react';
import { RECYCLING_BINS_DATA } from './RecyclingBins';

/**
 * Center Column: Prediction Result Card matching reference image
 */
export function PredictionResultCard({ result, previewUrl }) {
  if (!result) {
    // Standby empty state matching reference card proportions
    return (
      <div className="bg-white rounded-2xl p-5 sm:p-6 border-2 border-[#bbf7d0] shadow-[0_2px_0_0_#bbf7d0] h-full flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-md bg-[#22c55e] border border-[#15803d] flex items-center justify-center text-white shrink-0 shadow-2xs">
              <BarChart3 className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold font-pixel text-[#0f172a] leading-tight">
              Prediction Result
            </h2>
          </div>

          <div className="text-center py-12 px-4 rounded-xl border border-dashed border-[#bbf7d0] bg-[#f0fdf4]/40">
            <div className="w-12 h-12 rounded-xl bg-white border border-[#bbf7d0] text-[#16a34a] flex items-center justify-center mx-auto mb-3 shadow-2xs">
              <Sparkles className="w-6 h-6" />
            </div>
            <p className="font-pixel text-sm font-bold text-[#0f172a]">
              Awaiting Classification
            </p>
            <p className="text-xs text-slate-500 font-sans mt-1 max-w-xs mx-auto">
              Select or drop an image and click <strong className="text-[#16a34a]">Classify Waste</strong> to view CNN class probabilities.
            </p>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-[#d1fae5] text-[11px] text-slate-400 font-sans flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-[#16a34a] shrink-0" />
          <span>Softmax probability distribution across 6 waste categories.</span>
        </div>
      </div>
    );
  }

  const {
    predicted_class,
    confidence,
    probabilities = [],
    guidance,
  } = result;

  const confidencePercent = (confidence * 100).toFixed(1);
  const isLowConfidence = confidence < 0.6;

  const binStyle =
    RECYCLING_BINS_DATA.find((b) => b.id === predicted_class?.toLowerCase()) ||
    RECYCLING_BINS_DATA[5];

  // Sort probabilities with top class first or ordered matching reference
  const sortedProbabilities = [...probabilities].sort((a, b) => {
    // Put top predicted class first, then descending probability
    if (a.class_name.toLowerCase() === predicted_class?.toLowerCase()) return -1;
    if (b.class_name.toLowerCase() === predicted_class?.toLowerCase()) return 1;
    return b.probability - a.probability;
  });

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 border-2 border-[#bbf7d0] shadow-[0_2px_0_0_#bbf7d0] h-full flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-md bg-[#22c55e] border border-[#15803d] flex items-center justify-center text-white shrink-0 shadow-2xs">
            <BarChart3 className="w-4 h-4" />
          </div>
          <h2 className="text-lg font-bold font-pixel text-[#0f172a] leading-tight">
            Prediction Result
          </h2>
        </div>

        {/* Top Result Banner matching reference */}
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#f8fafc] border border-slate-200/90 mb-4 shadow-2xs">
          {/* Thumbnail preview */}
          <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-slate-200 border-2 border-white shadow-2xs shrink-0">
            {previewUrl || result.thumbnailUrl ? (
              <img
                src={previewUrl || result.thumbnailUrl}
                alt={predicted_class}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400">
                <Package className="w-6 h-6" />
              </div>
            )}
          </div>

          {/* Predicted Category & Recommended Bin */}
          <div className="min-w-0 flex-1">
            <h3 className="font-pixel text-xl sm:text-2xl font-bold text-[#0f172a] capitalize leading-none truncate">
              {predicted_class}
            </h3>
            <div className="mt-1">
              <span className="inline-block text-[11px] font-sans font-semibold px-2.5 py-0.5 rounded-full bg-[#fef3c7] text-[#92400e] border border-[#fde68a] truncate max-w-full">
                {guidance?.bin_name || `${predicted_class} Bin`}
              </span>
            </div>
          </div>

          {/* Confidence Badge Pill matching reference */}
          <div className="bg-[#ecfdf5] border border-[#a7f3d0] rounded-xl px-3 py-1.5 text-center shrink-0 shadow-2xs">
            <div className="text-[10px] font-sans font-bold text-[#059669] uppercase tracking-wider">
              Confidence
            </div>
            <div className="font-pixel text-xl sm:text-2xl font-bold text-[#16a34a] leading-none mt-0.5">
              {confidencePercent}%
            </div>
          </div>
        </div>

        {/* Six Category Probability Bars matching reference */}
        <div className="space-y-2 mt-4">
          {sortedProbabilities.map((item) => {
            const pct = (item.probability * 100).toFixed(1);
            const isTop = item.class_name.toLowerCase() === predicted_class?.toLowerCase();
            const classBin = RECYCLING_BINS_DATA.find((b) => b.id === item.class_name.toLowerCase());
            const dotColor = classBin?.accentColor || '#64748b';

            return (
              <div key={item.class_id} className="flex items-center justify-between gap-3 text-xs">
                {/* Dot + Class name */}
                <div className="flex items-center gap-2 w-20 shrink-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: dotColor }}
                  />
                  <span
                    className={`capitalize truncate ${
                      isTop ? 'font-bold text-[#0f172a]' : 'font-medium text-slate-600'
                    }`}
                  >
                    {item.class_name}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: isTop ? dotColor : '#cbd5e1',
                    }}
                  />
                </div>

                {/* Percentage */}
                <span className={`font-mono text-xs w-11 text-right shrink-0 ${isTop ? 'font-bold text-[#0f172a]' : 'text-slate-500'}`}>
                  {pct}%
                </span>
              </div>
            );
          })}
        </div>

        {/* Low Confidence Warning Notice */}
        {isLowConfidence && (
          <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-2 shadow-2xs">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold">Moderate Confidence ({confidencePercent}%): </span>
              <span>Visual ambiguity detected. Estimated statistical output; please verify packaging labels manually.</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer notice */}
      <div className="mt-4 pt-3 border-t border-[#d1fae5] text-[11px] text-slate-400 font-sans flex items-start gap-1.5">
        <Info className="w-3.5 h-3.5 text-[#16a34a] shrink-0 mt-0.5" />
        <span>Confidence is the model's estimated probability, not guaranteed correctness.</span>
      </div>
    </div>
  );
}

/**
 * Right Column: Recycling Guidance Card matching reference image
 */
export function RecyclingGuidanceCard({ guidance, predictedClass }) {
  // Default instructions matching reference layout if no prediction yet
  const defaultInstructions = [
    { text: 'Keep it clean and dry', icon: CheckCircle2 },
    { text: 'Remove plastic tape and labels', icon: Recycle },
    { text: 'Flatten boxes to save space', icon: Package },
    { text: 'Place in the paper & cardboard recycling bin', icon: Trash2 },
  ];

  const instructions = guidance?.instructions && guidance.instructions.length > 0
    ? guidance.instructions.map((step, idx) => {
        // Pick appropriate icon based on instruction wording
        const lower = step.toLowerCase();
        let Icon = CheckCircle2;
        if (lower.includes('tape') || lower.includes('cap') || lower.includes('lid') || lower.includes('separate')) {
          Icon = Recycle;
        } else if (lower.includes('flatten') || lower.includes('box') || lower.includes('crush') || lower.includes('can')) {
          Icon = Package;
        } else if (lower.includes('bin') || lower.includes('landfill') || lower.includes('dispose') || lower.includes('bag')) {
          Icon = Trash2;
        }
        return { text: step, icon: Icon };
      })
    : defaultInstructions;

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 border-2 border-[#bbf7d0] shadow-[0_2px_0_0_#bbf7d0] h-full flex flex-col justify-between">
      <div>
        {/* Header matching reference */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-md bg-[#eab308] border border-[#ca8a04] flex items-center justify-center text-white shrink-0 shadow-2xs">
            <Lightbulb className="w-4 h-4" />
          </div>
          <h2 className="text-lg font-bold font-pixel text-[#0f172a] leading-tight">
            Recycling Guidance
          </h2>
        </div>

        {/* 4 Clean Action Guidance Cards matching reference */}
        <div className="space-y-2.5">
          {instructions.slice(0, 4).map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="p-3 rounded-xl bg-[#f0fdf4]/70 border border-[#bbf7d0] flex items-center gap-3 text-xs sm:text-sm font-medium text-[#0f172a] shadow-2xs"
              >
                <div className="w-8 h-8 rounded-lg bg-white border border-[#bbf7d0] flex items-center justify-center text-[#16a34a] shrink-0 shadow-2xs">
                  <Icon className="w-4 h-4 text-[#16a34a]" />
                </div>
                <span className="leading-snug">{item.text}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Municipal Disclaimer at bottom */}
      <div className="mt-4 pt-3 border-t border-[#d1fae5] text-[11px] text-slate-500 font-sans leading-relaxed">
        <p>
          <strong className="text-slate-700">Notice: </strong>
          {guidance?.disclaimer ||
            'Guidance only: Recycling rules, accepted items, and bin color coding vary by city and local contractor. Always check local municipal guidelines.'}
        </p>
      </div>
    </div>
  );
}

export default function ClassificationResult({ result, previewUrl }) {
  if (!result) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
      <PredictionResultCard result={result} previewUrl={previewUrl} />
      <RecyclingGuidanceCard
        guidance={result?.guidance}
        predictedClass={result?.predicted_class}
      />
    </div>
  );
}

