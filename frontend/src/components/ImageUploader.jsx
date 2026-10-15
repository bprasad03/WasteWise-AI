import React, { useRef, useState } from 'react';
import { UploadCloud, Image as ImageIcon, X, AlertCircle, ArrowRight, Loader2, Sparkles } from 'lucide-react';

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
    <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-xs border border-slate-200/90 transition-all">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>Upload Waste Item</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Drag & drop or browse a photo for CNN visual inference.
          </p>
        </div>
        <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
          JPG / PNG &bull; Max 10 MB
        </span>
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
          className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-all select-none ${
            isDragOver
              ? 'border-emerald-500 bg-emerald-50/60 scale-[1.01]'
              : 'border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/20 bg-slate-50/40'
          }`}
        >
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3.5 shadow-2xs border border-emerald-100">
            <UploadCloud className="w-7 h-7 sm:w-8 sm:h-8" />
          </div>
          <p className="text-sm sm:text-base font-semibold text-slate-800">
            Drag & drop an image here, or{' '}
            <span className="text-emerald-600 hover:text-emerald-700 underline underline-offset-2">browse files</span>
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Supports bottle, can, paper, box, plastic tub, or general trash imagery
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative rounded-xl border border-slate-200 overflow-hidden bg-slate-900 flex items-center justify-center max-h-72 sm:max-h-80 shadow-xs">
            <img
              src={previewUrl}
              alt="Waste preview"
              className="max-h-72 sm:max-h-80 w-auto object-contain mx-auto transition-transform hover:scale-[1.02] duration-200"
            />
            {/* Top overlay remove button */}
            <div className="absolute top-3 right-3 flex items-center gap-2">
              <button
                type="button"
                onClick={onClear}
                title="Remove image"
                className="bg-black/65 hover:bg-black/85 text-white p-1.5 rounded-full backdrop-blur-xs transition-colors shadow-xs cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Bottom metadata pill */}
            <div className="absolute bottom-3 left-3 right-3 bg-black/65 backdrop-blur-md rounded-lg px-3 py-1.5 flex items-center justify-between text-white text-xs">
              <div className="flex items-center gap-2 truncate">
                <ImageIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate font-medium">{selectedFile?.name}</span>
              </div>
              <span className="text-slate-300 shrink-0 text-[11px]">
                {selectedFile && formatFileSize(selectedFile.size)}
              </span>
            </div>
          </div>

          {/* Action Buttons with Prominent Green CTA */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              type="button"
              onClick={onClassify}
              disabled={isLoading}
              className="w-full sm:flex-1 py-3 px-6 rounded-xl font-semibold text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs hover:shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing Neural Inference...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Classify Waste & Get Guidance</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClear}
              disabled={isLoading}
              className="w-full sm:w-auto py-3 px-4 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Change Photo
            </button>
          </div>
        </div>
      )}

      {/* Error displays */}
      {(validationError || error) && (
        <div className="mt-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1 leading-relaxed">
            <span className="font-semibold">Classification Issue: </span>
            <span>{validationError || error}</span>
          </div>
        </div>
      )}
    </div>
  );
}
