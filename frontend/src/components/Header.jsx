import React from 'react';
import { Leaf, RefreshCw, ShieldCheck } from 'lucide-react';

export default function Header({ backendStatus, onRefreshStatus }) {
  const isHealthy = backendStatus?.model_loaded;
  const isChecking = backendStatus?.checking;

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-row items-center justify-between gap-3">
        {/* Brand identity */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-xs shadow-emerald-500/20 shrink-0">
            <Leaf className="w-5 h-5 drop-shadow-xs" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 font-sans truncate">
                WasteWise<span className="text-emerald-600">-AI</span>
              </h1>
              <span className="hidden xs:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/80 shrink-0">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Damped CNN
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 font-medium truncate">
              Smart Waste Sorting & Municipal Recycling
            </p>
          </div>
        </div>

        {/* Backend status pill & controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onRefreshStatus}
            disabled={isChecking}
            title="Refresh backend status"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all disabled:opacity-60 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${isChecking ? 'animate-spin' : ''}`} />
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2 shrink-0">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    isHealthy ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    isHealthy ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
              </span>
              <span className="hidden sm:inline">
                {isChecking
                  ? 'Connecting...'
                  : isHealthy
                  ? 'Inference Ready'
                  : 'Backend Offline'}
              </span>
              <span className="sm:hidden text-[11px]">
                {isChecking ? '...' : isHealthy ? 'Ready' : 'Offline'}
              </span>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
}
