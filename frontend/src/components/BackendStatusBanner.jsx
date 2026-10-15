import React from 'react';
import { AlertCircle, Terminal, RefreshCw } from 'lucide-react';
import { API_BASE_URL } from '../services/api';

export default function BackendStatusBanner({ backendStatus, onRetry }) {
  if (backendStatus?.model_loaded || backendStatus?.checking) {
    return null;
  }

  return (
    <div className="bg-amber-50/90 border-b border-amber-200/80 px-4 py-3 sm:px-6 overflow-hidden">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-950">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div className="text-xs sm:text-sm min-w-0 flex-1">
            <span className="font-semibold text-amber-900">Inference Backend Disconnected: </span>
            Cannot reach FastAPI at <code className="bg-amber-100/80 px-1.5 py-0.5 rounded text-xs font-mono border border-amber-200">{API_BASE_URL}</code>.
            Please launch the server from your project root:
            <div className="mt-1.5 flex items-center gap-2 font-mono text-[11px] sm:text-xs bg-slate-900 text-emerald-400 px-3 py-1.5 rounded-lg w-full sm:w-fit overflow-x-auto shadow-2xs">
              <Terminal className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="whitespace-nowrap">uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload</span>
            </div>
          </div>
        </div>
        <button
          onClick={onRetry}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium transition-colors shadow-2xs self-end sm:self-center cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry Connection
        </button>
      </div>
    </div>
  );
}
