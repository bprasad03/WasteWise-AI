import React, { useRef, useState } from 'react';
import { X, AlertCircle, Loader2 } from 'lucide-react';

export default function ImageUploader({
  selectedFile,
  previewUrl,
  onFileSelect,
  onClear,
  onClassify,
  isLoading,
  error,
}) {
  const fileInputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [validationError, setValidationError] = useState(null);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const validateAndPassFile = (file) => {
    setValidationError(null);
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    const validExtensions = ['.jpg', '.jpeg', '.png'];
    const hasValidExt = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));

    if (!validTypes.includes(file.type) && !hasValidExt) {
      setValidationError('Unsupported format. Please select a JPG, JPEG, or PNG image.');
      return;
    }

    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      setValidationError('File exceeds 10 MB limit. Please select a smaller photo.');
      return;
    }

    onFileSelect(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndPassFile(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndPassFile(e.target.files[0]);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 border-2 border-[#bbf7d0] shadow-[0_2px_0_0_#bbf7d0] h-full flex flex-col justify-between">
      <div>
        {/* Header matching reference */}
        <div className="flex items-start gap-2.5 mb-4">
          <div className="w-7 h-7 rounded-md bg-[#22c55e] border border-[#15803d] flex items-center justify-center text-white shrink-0 mt-0.5 shadow-2xs">
            <svg
              viewBox="0 0 24 24"
              className="w-4 h-4 fill-none stroke-white stroke-2"
              style={{ shapeRendering: 'crispEdges' }}
            >
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <polyline points="3 7 12 13 21 7" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold font-pixel text-[#0f172a] leading-tight">
              Upload Waste Item
            </h2>
            <p className="text-xs text-slate-500 font-sans mt-0.5">
              Drag and drop or select a photo for instant CNN inference.
            </p>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,image/jpeg,image/png"
          className="hidden"
          onChange={handleInputChange}
        />

        {/* Upload Zone / Preview Area */}
        {!previewUrl ? (
          <div
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all select-none ${
              isDragOver
                ? 'border-[#22c55e] bg-[#dcfce7] scale-[1.01]'
                : 'border-[#86efac] hover:border-[#22c55e] bg-[#f0fdf4]/50 hover:bg-[#ecfdf5]'
            }`}
          >
            {/* Pixel Art Picture Icon matching reference */}
            <div className="w-16 h-14 mb-3 flex items-center justify-center">
              <svg
                viewBox="0 0 48 40"
                className="w-14 h-12"
                style={{ shapeRendering: 'crispEdges' }}
              >
                {/* Frame border */}
                <rect x="2" y="2" width="44" height="36" rx="3" fill="none" stroke="#16a34a" strokeWidth="2.5" />
                {/* Sun */}
                <circle cx="36" cy="12" r="3.5" fill="#eab308" />
                {/* Left Mountain */}
                <polygon points="6,34 18,18 28,34" fill="#22c55e" stroke="#15803d" strokeWidth="1.5" />
                {/* Right Mountain */}
                <polygon points="22,34 33,22 42,34" fill="#16a34a" stroke="#14532d" strokeWidth="1.5" />
              </svg>
            </div>

            <p className="text-sm font-semibold text-[#0f172a] font-sans">
              Drag & drop an image here
            </p>
            <p className="text-xs font-semibold text-[#16a34a] font-sans mt-0.5">
              or click to browse
            </p>
            <p className="text-[11px] text-slate-400 mt-2 font-sans">
              JPG, PNG &bull; Max 10 MB
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative rounded-xl border-2 border-[#bbf7d0] overflow-hidden bg-slate-900 flex items-center justify-center max-h-60 sm:max-h-64 shadow-xs">
              <img
                src={previewUrl}
                alt="Waste preview"
                className="max-h-60 sm:max-h-64 w-auto object-contain mx-auto transition-transform hover:scale-[1.02] duration-200"
              />
              {/* Top overlay remove button */}
              <div className="absolute top-2.5 right-2.5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClear}
                  title="Remove image"
                  className="bg-black/70 hover:bg-black/90 text-white p-1.5 rounded-full backdrop-blur-xs transition-colors shadow-xs cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              {/* Bottom metadata pill */}
              <div className="absolute bottom-2.5 left-2.5 right-2.5 bg-black/70 backdrop-blur-xs rounded-lg px-3 py-1 flex items-center justify-between text-white text-[11px]">
                <span className="truncate font-medium">{selectedFile?.name}</span>
                <span className="text-slate-300 shrink-0 ml-2">
                  {selectedFile && formatFileSize(selectedFile.size)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Error displays */}
        {(validationError || error) && (
          <div className="mt-3.5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">
              <span className="font-semibold">Notice: </span>
              <span>{validationError || error}</span>
            </div>
          </div>
        )}
      </div>

      {/* Prominent Green Pixel Action Button matching reference */}
      <div className="mt-4 pt-2">
        <button
          type="button"
          onClick={onClassify}
          disabled={isLoading || !selectedFile}
          className="w-full py-3 px-6 rounded-xl font-pixel font-bold text-sm sm:text-base bg-[#16a34a] hover:bg-[#15803d] text-white border-2 border-[#14532d] shadow-[0_4px_0_0_#14532d] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Analyzing Waste...</span>
            </>
          ) : (
            <>
              {/* Pixel sparkle icon */}
              <span className="text-emerald-200 text-lg">✦</span>
              <span>Classify Waste</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

