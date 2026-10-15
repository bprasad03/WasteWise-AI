import React, { useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import Header from './components/Header';
import BackendStatusBanner from './components/BackendStatusBanner';
import RecyclingBins from './components/RecyclingBins';
import ImageUploader from './components/ImageUploader';
import ClassificationResult from './components/ClassificationResult';
import SessionStats from './components/SessionStats';
import { fetchHealth, predictWaste } from './services/api';
import { createThumbnailDataUrl } from './utils/thumbnail';
import { Sparkles, Shield, Compass } from 'lucide-react';

export default function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [predictionResult, setPredictionResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [selectedBin, setSelectedBin] = useState(null);
  const [backendStatus, setBackendStatus] = useState({
    model_loaded: false,
    checking: true,
    error: null,
  });

  // Track active blob URL for safe garbage collection and prevent memory leaks
  const activeBlobUrlRef = useRef(null);

  const revokeActiveBlob = () => {
    if (activeBlobUrlRef.current && activeBlobUrlRef.current.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(activeBlobUrlRef.current);
      } catch {
        // ignore
      }
      activeBlobUrlRef.current = null;
    }
  };

  // Clean up blob URL on component unmount
  useEffect(() => {
    return () => {
      revokeActiveBlob();
    };
  }, []);

  // Check backend health on initial load and periodically
  const checkBackendHealth = useCallback(async () => {
    setBackendStatus((prev) => ({ ...prev, checking: true, error: null }));
    try {
      const data = await fetchHealth();
      setBackendStatus({
        model_loaded: Boolean(data.model_loaded),
        checking: false,
        error: null,
      });
    } catch (err) {
      setBackendStatus({
        model_loaded: false,
        checking: false,
        error: err.message,
      });
    }
  }, []);

  useEffect(() => {
    checkBackendHealth();
    const interval = setInterval(checkBackendHealth, 15000);
    return () => clearInterval(interval);
  }, [checkBackendHealth]);

  // Handle file selection from ImageUploader
  const handleFileSelect = (file) => {
    setSelectedFile(file);
    setError(null);

    // Revoke previous blob URL to prevent memory leaks
    revokeActiveBlob();

    const url = URL.createObjectURL(file);
    activeBlobUrlRef.current = url;
    setPreviewUrl(url);
  };

  // Clear current selection
  const handleClear = () => {
    setSelectedFile(null);
    revokeActiveBlob();
    setPreviewUrl(null);
    setError(null);
    setPredictionResult(null);
  };

  // Perform classification API request
  const handleClassify = async () => {
    if (!selectedFile) {
      setError('Please choose or drop an image file first.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Generate persistent data URL thumbnail concurrently for history
      const [result, thumbnailDataUrl] = await Promise.all([
        predictWaste(selectedFile),
        createThumbnailDataUrl(selectedFile, 120, 120),
      ]);

      setPredictionResult(result);

      // Trigger celebratory confetti if confidence is high and recyclable
      if (
        result.confidence >= 0.75 &&
        result.predicted_class?.toLowerCase() !== 'trash'
      ) {
        confetti({
          particleCount: 45,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#22c55e', '#10b981', '#06b6d4', '#eab308'],
        });
      }

      // Add to session history with persistent Data URL thumbnail
      const historyItem = {
        ...result,
        thumbnailUrl: thumbnailDataUrl,
        previewUrl: thumbnailDataUrl || previewUrl,
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };

      setHistory((prev) => [historyItem, ...prev.slice(0, 19)]);
    } catch (err) {
      setError(err.message || 'An unexpected error occurred during inference.');
    } finally {
      setIsLoading(false);
    }
  };

  // Select historical item to inspect
  const handleSelectHistoryItem = (item) => {
    setPredictionResult(item);
    if (item.thumbnailUrl || item.previewUrl) {
      setPreviewUrl(item.thumbnailUrl || item.previewUrl);
    }
    // Smooth scroll to results on mobile devices
    if (window.innerWidth < 1024) {
      window.scrollTo({ top: 400, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 overflow-x-hidden font-sans">
      {/* Top Header */}
      <Header
        backendStatus={backendStatus}
        onRefreshStatus={checkBackendHealth}
      />

      {/* Offline Alert Banner */}
      <BackendStatusBanner
        backendStatus={backendStatus}
        onRetry={checkBackendHealth}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Modern Eco-Tech Hero Intro */}
        <section className="bg-gradient-to-r from-slate-900 via-slate-850 to-emerald-950 text-white rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-sm relative overflow-hidden">
          <div className="relative z-10 max-w-2xl space-y-2.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              Deep Learning Waste Intelligence
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-sans leading-tight">
              Automated Waste Sorting & Recycling Guidance
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
              Upload everyday waste items to evaluate with our verified square-root damped Convolutional Neural Network. Get real-time class probability distributions and standardized municipal disposal guidelines.
            </p>
          </div>
        </section>

        {/* Six Clean Modern Recycling Bins */}
        <section>
          <RecyclingBins
            activeCategory={predictionResult?.predicted_class}
            selectedBin={selectedBin}
            onSelectBin={(id) => setSelectedBin(selectedBin === id ? null : id)}
          />
        </section>

        {/* Dashboard 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
          {/* Left Column: Uploader & Session Stats (7 cols on lg) */}
          <div className="lg:col-span-7 space-y-6">
            <ImageUploader
              selectedFile={selectedFile}
              previewUrl={previewUrl}
              onFileSelect={handleFileSelect}
              onClear={handleClear}
              onClassify={handleClassify}
              isLoading={isLoading}
              error={error}
            />

            <SessionStats
              history={history}
              onSelectHistoryItem={handleSelectHistoryItem}
            />
          </div>

          {/* Right Column: Prediction Results or Getting Started Guide (5 cols on lg, sticky on desktop) */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-20">
            {predictionResult ? (
              <ClassificationResult result={predictionResult} />
            ) : (
              <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200/90 space-y-5 text-slate-700">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center font-bold shrink-0">
                    <Compass className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900">
                      How WasteWise Works
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      3 simple steps to smarter recycling
                    </p>
                  </div>
                </div>

                <div className="space-y-3.5 text-xs">
                  <div className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60">
                    <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                      1
                    </div>
                    <div>
                      <span className="font-bold text-slate-900">Upload or Drop: </span>
                      Select a clear photo of an empty bottle, tin can, cardboard box, paper, or plastic container.
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60">
                    <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                      2
                    </div>
                    <div>
                      <span className="font-bold text-slate-900">Neural Inference: </span>
                      Our custom regularized CNN decodes and resizes to 224&times;224, predicting category probability distribution.
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60">
                    <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                      3
                    </div>
                    <div>
                      <span className="font-bold text-slate-900">Bin & Action Guidance: </span>
                      The matching bin highlights automatically with actionable municipal preparation tips.
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-start gap-2">
                  <Shield className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">
                    Privacy protected: Uploaded images are evaluated in-memory only and are never saved to disk.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Clean Modern Footer */}
      <footer className="mt-12 border-t border-slate-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            <span className="font-bold text-slate-700">WasteWise-AI</span> &bull; Deep Learning Computer Vision CA1 Project
          </div>
          <div className="text-center sm:text-right text-[11px] max-w-md">
            Guidance notice: AI classifications provide general sorting assistance and are not legally binding guarantees of municipal recycling bylaws.
          </div>
        </div>
      </footer>
    </div>
  );
}
