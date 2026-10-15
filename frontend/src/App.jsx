import React, { useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import Header from './components/Header';
import BackendStatusBanner from './components/BackendStatusBanner';
import RecyclingBins from './components/RecyclingBins';
import ImageUploader from './components/ImageUploader';
import {
  PredictionResultCard,
  RecyclingGuidanceCard,
} from './components/ClassificationResult';
import SessionStats from './components/SessionStats';
import { fetchHealth, predictWaste } from './services/api';
import { createThumbnailDataUrl } from './utils/thumbnail';

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
    <div className="min-h-screen flex flex-col bg-[#f4f8f5] text-[#0f172a] overflow-x-hidden font-sans">
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
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-6">
        {/* Pixel Art Landscape Hero Banner matching reference image */}
        <section className="relative rounded-2xl border-2 border-[#bbf7d0] shadow-[0_2px_0_0_#bbf7d0] overflow-hidden bg-gradient-to-b from-[#e6f7ff] via-[#edf9f2] to-[#def5e5] p-5 sm:p-7 lg:p-8">
          {/* Pixel Art SVG Scenery Layer */}
          <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
            <svg
              className="w-full h-full"
              preserveAspectRatio="none"
              viewBox="0 0 1200 320"
              style={{ shapeRendering: 'crispEdges' }}
            >
              {/* White Pixel Clouds in sky */}
              <g fill="#ffffff" opacity="0.85">
                <rect x="80" y="24" width="60" height="12" rx="2" />
                <rect x="96" y="14" width="32" height="10" rx="2" />
                <rect x="440" y="36" width="70" height="14" rx="2" />
                <rect x="460" y="24" width="36" height="12" rx="2" />
                <rect x="880" y="20" width="84" height="14" rx="2" />
                <rect x="904" y="10" width="40" height="10" rx="2" />
              </g>

              {/* Distant Teal/Mint Skyline */}
              <g fill="#a7d7c5" opacity="0.45">
                <rect x="620" y="130" width="24" height="110" />
                <rect x="628" y="110" width="8" height="20" />
                <rect x="650" y="150" width="32" height="90" />
                <rect x="690" y="125" width="26" height="115" />
                <rect x="724" y="140" width="30" height="100" />
                <rect x="760" y="115" width="28" height="125" />
                <rect x="770" y="95" width="8" height="20" />
                <rect x="796" y="145" width="24" height="95" />
                <rect x="828" y="130" width="34" height="110" />
              </g>

              {/* Pixel Tree on Left Border */}
              <g>
                <rect x="8" y="190" width="10" height="60" fill="#78350f" />
                <polygon points="13,110 38,160 -12,160" fill="#15803d" />
                <polygon points="13,140 42,200 -16,200" fill="#16a34a" />
                <polygon points="13,175 46,240 -20,240" fill="#22c55e" />
              </g>

              {/* Pixel Tree on Right Border */}
              <g>
                <rect x="1178" y="180" width="12" height="70" fill="#78350f" />
                <circle cx="1184" cy="140" r="30" fill="#15803d" />
                <circle cx="1165" cy="150" r="22" fill="#16a34a" />
                <circle cx="1198" cy="150" r="20" fill="#22c55e" />
              </g>

              {/* Stepped Pixel Grass Hill at Bottom */}
              <polygon points="0,270 1200,245 1200,320 0,320" fill="#22c55e" />
              <polygon points="0,288 1200,265 1200,320 0,320" fill="#16a34a" />
              <polygon points="0,305 1200,288 1200,320 0,320" fill="#15803d" />
            </svg>
          </div>

          {/* Hero Content: Title on Left, Six Bins on Right */}
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Left Typography */}
            <div className="lg:col-span-5 space-y-3">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-pixel text-[#0f172a] leading-tight tracking-wide">
                Smarter Waste Sorting for a Cleaner Planet
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 font-sans leading-relaxed max-w-md">
                Upload an image and let our deep learning model identify the waste item and provide recycling guidance.
              </p>
            </div>

            {/* Right: The Six Pixel Recycling Bins sitting on grass */}
            <div className="lg:col-span-7 flex justify-center lg:justify-end">
              <RecyclingBins
                activeCategory={predictionResult?.predicted_class}
                selectedBin={selectedBin}
                onSelectBin={(id) => setSelectedBin(selectedBin === id ? null : id)}
              />
            </div>
          </div>
        </section>

        {/* Main 3-Column Classification Interface matching reference image */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
          {/* Left Column: Upload Waste Item */}
          <ImageUploader
            selectedFile={selectedFile}
            previewUrl={previewUrl}
            onFileSelect={handleFileSelect}
            onClear={handleClear}
            onClassify={handleClassify}
            isLoading={isLoading}
            error={error}
          />

          {/* Center Column: Prediction Result */}
          <PredictionResultCard
            result={predictionResult}
            previewUrl={previewUrl}
          />

          {/* Right Column: Recycling Guidance */}
          <RecyclingGuidanceCard
            guidance={predictionResult?.guidance}
            predictedClass={predictionResult?.predicted_class}
          />
        </section>

        {/* Bottom Section: Session Activity & Recent Classification History */}
        <section>
          <SessionStats
            history={history}
            onSelectHistoryItem={handleSelectHistoryItem}
          />
        </section>
      </main>

      {/* Clean Pixel-Art Footer */}
      <footer className="mt-8 border-t border-[#d1fae5] bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-pixel font-bold text-sm text-[#0f172a]">
              WasteWise<span className="text-[#16a34a]">-AI</span>
            </span>
            <span>&bull; Deep Learning Computer Vision CA1 Project</span>
          </div>
          <div className="text-center sm:text-right text-[11px] text-slate-400 max-w-md">
            Guidance notice: AI classifications provide general sorting assistance and are not legally binding guarantees of municipal recycling bylaws.
          </div>
        </div>
      </footer>
    </div>
  );
}

