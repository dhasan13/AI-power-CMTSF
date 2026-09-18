import React, { useState } from 'react';
import {
  FileAudio,
  Shield,
  Upload,
  Info,
  Layers,
  Activity,
  Radio,
  Sparkles,
  Server,
  FileCheck2,
} from 'lucide-react';
import { AudioUploader } from './AudioUploader';
import { AudioPlayer } from './AudioPlayer';
import { AnalysisProgress } from './AnalysisProgress';
import { ResultCard } from './ResultCard';
import { FeatureCards } from './FeatureCards';
import { Mp3AnalysisResponse, downloadPdfReport, downloadJsonReport } from '../utils/reportExport';
import { analyzeMp3Audio, checkBackendHealth } from '../services/api';

const PIPELINE_STEPS = [
  { label: 'Uploading', detail: 'Validating MP3 signature & file size limit' },
  { label: 'Extracting Audio', detail: 'Converting MP3 to 16 kHz Mono 16-bit PCM' },
  { label: 'Analyzing Spectral', detail: 'Constant-Q, log-mel spectrogram & phase CNN' },
  { label: 'Analyzing Prosody', detail: 'F0 contour, pitch jitter & cadence TCN' },
  { label: 'Analyzing Channel', detail: 'SNR floor, reverberation & codec artifacts' },
  { label: 'Generating Result', detail: 'Gated Attention Fusion & XAI reasoning' },
];

export const Mp3AuthenticityDashboard: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [analysisResult, setAnalysisResult] = useState<Mp3AnalysisResponse | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const handleFileSelected = (file: File) => {
    setSelectedFile(file);
    setAnalysisResult(null);
    setErrorNotice(null);
  };

  const handleRunAnalysis = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setCurrentStepIndex(0);
    setErrorNotice(null);

    try {
      // Step 1: Uploading
      setCurrentStepIndex(0);
      await new Promise((r) => setTimeout(r, 450));

      // Step 2: Extracting Audio
      setCurrentStepIndex(1);
      await new Promise((r) => setTimeout(r, 400));

      // Step 3: Spectral
      setCurrentStepIndex(2);
      await new Promise((r) => setTimeout(r, 450));

      // Step 4: Prosody
      setCurrentStepIndex(3);
      await new Promise((r) => setTimeout(r, 450));

      // Step 5: Channel
      setCurrentStepIndex(4);
      await new Promise((r) => setTimeout(r, 400));

      // Call API / Analyze
      const res = await analyzeMp3Audio(selectedFile, (stepLabel, pct) => {
        if (pct < 30) setCurrentStepIndex(0);
        else if (pct < 50) setCurrentStepIndex(1);
        else if (pct < 65) setCurrentStepIndex(2);
        else if (pct < 80) setCurrentStepIndex(3);
        else if (pct < 95) setCurrentStepIndex(4);
        else setCurrentStepIndex(5);
      });

      // Step 6: Generating Final Result
      setCurrentStepIndex(5);
      await new Promise((r) => setTimeout(r, 350));

      setAnalysisResult(res);
    } catch (err: any) {
      console.error('Analysis error:', err);
      setErrorNotice(err.message || 'Analysis could not be completed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAnalyzeAnother = () => {
    setSelectedFile(null);
    setAnalysisResult(null);
    setCurrentStepIndex(0);
    setErrorNotice(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Welcome & Architecture Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-cyan-950/40 border border-slate-800 rounded-xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-cyan-950 text-cyan-300 border border-cyan-800/80 uppercase">
                Customer Authenticity Verification
              </span>
              <span className="text-xs text-slate-400 font-mono">• 16 kHz Mono Standard</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <span>CMTSF-Net Voice Authenticity Detection</span>
            </h2>

            <p className="text-sm text-slate-300 max-w-3xl mt-1 leading-relaxed">
              Upload any audio file (MP3, WAV, M4A) to verify whether speech is produced by an organic human voice or an AI-generated synthetic clone (TTS, neural vocoder, voice conversion).
            </p>
          </div>

          <div className="flex items-center gap-2 self-start lg:self-center shrink-0">
            <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 text-left">
              <span className="text-[10px] font-mono text-slate-400 block uppercase">Fusion Architecture</span>
              <span className="text-xs font-semibold text-cyan-400">Gated Attention</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 text-left">
              <span className="text-[10px] font-mono text-slate-400 block uppercase">Quality Conditioning</span>
              <span className="text-xs font-semibold text-emerald-400">Active (SNR / VAD)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Box Component */}
      <AudioUploader
        selectedFile={selectedFile}
        onFileSelected={handleFileSelected}
        onAnalyze={handleRunAnalysis}
        isProcessing={isProcessing}
      />

      {/* Audio Player Component (Appears when file is selected) */}
      {selectedFile && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <FileAudio className="w-3.5 h-3.5 text-cyan-400" />
              <span>Audio Playback & Preview</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">
              Listen before executing neural analysis
            </span>
          </div>
          <AudioPlayer file={selectedFile} />
        </div>
      )}

      {/* Processing Pipeline Status Tracker */}
      {isProcessing && (
        <AnalysisProgress
          currentStepIndex={currentStepIndex}
          steps={PIPELINE_STEPS}
        />
      )}

      {/* Error Banner */}
      {errorNotice && (
        <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-800/80 text-rose-200 text-xs flex items-start gap-2.5">
          <Info className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block">Processing Error</span>
            <span>{errorNotice}</span>
          </div>
        </div>
      )}

      {/* Results & Explainable AI */}
      {analysisResult && !isProcessing && (
        <div className="space-y-6">
          <ResultCard
            result={analysisResult}
            onAnalyzeAnother={handleAnalyzeAnother}
            onDownloadReport={() => downloadPdfReport(analysisResult)}
          />

          <FeatureCards result={analysisResult} />
        </div>
      )}
    </div>
  );
};
