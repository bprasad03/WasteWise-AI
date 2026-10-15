import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';

export default function Header({ backendStatus, onRefreshStatus }) {
  const isHealthy = backendStatus?.model_loaded;
  const isChecking = backendStatus?.checking;
  const [activeTab, setActiveTab] = useState('Home');

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xs border-b border-[#d1fae5] shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-row items-center justify-between gap-4">
        {/* Brand identity matching reference */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Pixel leaf logo badge */}
          <div className="w-10 h-10 rounded-lg bg-[#22c55e] border-2 border-[#15803d] shadow-[0_2px_0_0_#15803d] flex items-center justify-center text-white shrink-0">
            <svg
              viewBox="0 0 24 24"
              className="w-6 h-6 fill-none stroke-white stroke-[2.5] stroke-linecap-round stroke-linejoin-round"
              style={{ shapeRendering: 'crispEdges' }}
            >
              <path d="M12 3c-4.5 0-8 3.5-8 8 0 4.5 4 9 8 10 4-1 8-5.5 8-10 0-4.5-3.5-8-8-8z" />
              <path d="M12 21V9" />
              <path d="M12 13l4-3" />
              <path d="M12 16l-4-3" />
            </svg>
          </div>

          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold font-pixel tracking-wide text-[#0f172a] leading-none">
              WasteWise<span className="text-[#16a34a]">-AI</span>
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-500 font-sans mt-0.5 truncate">
              Smart Waste Classification & Recycling
            </p>
          </div>
        </div>

        {/* Center navigation & status pill */}
        <div className="flex items-center gap-6">
          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <button
              type="button"
              onClick={() => setActiveTab('Home')}
              className={`pb-1 transition-all cursor-pointer ${
                activeTab === 'Home'
                  ? 'text-[#0f172a] font-bold border-b-2 border-[#16a34a]'
                  : 'text-slate-600 hover:text-slate-900 border-b-2 border-transparent'
              }`}
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('About')}
              className={`pb-1 transition-all cursor-pointer ${
                activeTab === 'About'
                  ? 'text-[#0f172a] font-bold border-b-2 border-[#16a34a]'
                  : 'text-slate-600 hover:text-slate-900 border-b-2 border-transparent'
              }`}
            >
              About
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('How It Works')}
              className={`pb-1 transition-all cursor-pointer ${
                activeTab === 'How It Works'
                  ? 'text-[#0f172a] font-bold border-b-2 border-[#16a34a]'
                  : 'text-slate-600 hover:text-slate-900 border-b-2 border-transparent'
              }`}
            >
              How It Works
            </button>
          </nav>

          {/* Backend status pill & refresh */}
          <button
            onClick={onRefreshStatus}
            disabled={isChecking}
            title="Refresh backend status"
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#ecfdf5] hover:bg-[#d1fae5] text-[#15803d] border border-[#a7f3d0] shadow-2xs transition-all disabled:opacity-60 cursor-pointer"
          >
            <span className="relative flex h-2 w-2 shrink-0">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isHealthy ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isHealthy ? 'bg-[#16a34a]' : 'bg-amber-500'
                }`}
              />
            </span>
            <span>
              {isChecking
                ? 'Connecting...'
                : isHealthy
                ? 'Inference Ready'
                : 'Backend Offline'}
            </span>
            <RefreshCw className={`w-3 h-3 text-[#16a34a] ${isChecking ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
    </header>
  );
}
