import React, { useRef, useState } from 'react';
import { Upload, FileAudio, AlertCircle, Shield, CheckCircle2, Music } from 'lucide-react';

interface AudioUploaderProps {
  selectedFile: File | null;
  onFileSelected: (file: File) => void;
  onAnalyze: () => void;
  isProcessing: boolean;
  disabled?: boolean;
}

export const AudioUploader: React.FC<AudioUploaderProps> = ({
  selectedFile,
  onFileSelected,
  onAnalyze,
  isProcessing,
  disabled,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const validateAndSelect = (file: File) => {
    setErrorMsg(null);
    const validExtensions = ['.mp3', '.wav', '.m4a', '.aac', '.ogg'];
    const lowerName = file.name.toLowerCase();
    const isValidExt = validExtensions.some((ext) => lowerName.endsWith(ext));

    if (!isValidExt && !file.type.startsWith('audio/')) {
      setErrorMsg('Please select a valid audio file (MP3 preferred, up to 25MB).');
      return;
    }

    // Limit to 25MB
    const MAX_SIZE = 25 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setErrorMsg('File size exceeds the 25MB security limit.');
      return;
    }

    onFileSelected(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled || isProcessing) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled && !isProcessing) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleBrowseClick = () => {
    if (fileInputRef.current && !disabled && !isProcessing) {
      fileInputRef.current.click();
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div id="audio-uploader-card" className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-xl backdrop-blur-sm">
      {/* Header & Privacy Notice */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-4 border-b border-slate-800/80">
        <div>
          <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <FileAudio className="w-5 h-5 text-cyan-400" />
            MP3 Audio Ingestion
          </h2>
          <p className="text-xs text-slate-400">
            Upload voice recording or call snippet for CMTSF-Net multimodal spectral-temporal analysis.
          </p>
        </div>

        {/* Security / Privacy Badge */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700/80 text-[11px] text-slate-300 self-start sm:self-center">
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          <span>Strict Privacy: Ephemeral in-memory analysis only</span>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            validateAndSelect(e.target.files[0]);
          }
        }}
      />

      {/* Dropzone Box */}
      <div
        id="mp3-dropzone-box"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleBrowseClick}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
          isDragOver
            ? 'border-cyan-400 bg-cyan-950/20 shadow-lg shadow-cyan-500/10'
            : selectedFile
            ? 'border-emerald-500/40 bg-emerald-950/10 hover:border-emerald-500/60'
            : 'border-slate-700/80 hover:border-slate-600 bg-slate-950/40 hover:bg-slate-950/70'
        } ${isProcessing ? 'pointer-events-none opacity-60' : ''}`}
      >
        <div className="flex flex-col items-center justify-center gap-3">
          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-transform duration-200 ${
              isDragOver
                ? 'scale-110 bg-cyan-500/20 text-cyan-400'
                : selectedFile
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {selectedFile ? <CheckCircle2 className="w-7 h-7" /> : <Upload className="w-7 h-7" />}
          </div>

          <div>
            <p className="text-sm font-medium text-slate-200">
              {isDragOver ? (
                <span className="text-cyan-400 font-semibold">Drop MP3 audio file here</span>
              ) : selectedFile ? (
                <span className="text-emerald-300 font-semibold">{selectedFile.name}</span>
              ) : (
                <>
                  Drag & drop your <span className="text-cyan-400 font-semibold">MP3 audio file</span> here, or{' '}
                  <span className="text-cyan-400 underline decoration-cyan-400/40 underline-offset-2 hover:text-cyan-300">
                    Browse File
                  </span>
                </>
              )}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Supports MP3, WAV, M4A up to 25MB • Converted to 16 kHz Mono PCM for inference
            </p>
          </div>

          <button
            id="btn-browse-file"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleBrowseClick();
            }}
            disabled={isProcessing}
            className="mt-1 px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition shadow-sm hover:border-slate-600"
          >
            Browse File
          </button>
        </div>
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="mt-3 p-3 rounded-lg bg-rose-950/40 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Selected File Details & Quick Action */}
      {selectedFile && (
        <div className="mt-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
              <Music className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-200 truncate max-w-[240px] sm:max-w-[360px]">
                {selectedFile.name}
              </div>
              <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                <span>{formatFileSize(selectedFile.size)}</span>
                <span>•</span>
                <span>{selectedFile.type || 'audio/mpeg'}</span>
                <span>•</span>
                <span className="text-emerald-400 font-medium">Ready for pipeline</span>
              </div>
            </div>
          </div>

          {/* Analyze Audio Primary CTA */}
          <button
            id="btn-analyze-audio"
            onClick={onAnalyze}
            disabled={isProcessing}
            className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm shadow-lg shadow-cyan-500/25 transition duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Processing Pipeline...</span>
              </>
            ) : (
              <>
                <span>Analyze Audio</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
