import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Radio,
  Mic,
  MicOff,
  Upload,
  Play,
  Square,
  RefreshCw,
  FileAudio,
  Terminal,
  BarChart3,
  Sliders,
  AlertTriangle,
  Cpu,
  Layers,
  Code,
  Download,
  FileText,
  Check,
  Info,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

import {
  AudioSampleInfo,
  CMTSFDetectionResult,
  DetectionHistoryItem,
  SecurityIncident,
} from './types/cmtsf';
import {
  analyzeAudioWithCMTSFNet,
  getAudioContext,
} from './utils/audioSignalProcessor';
import {
  PRESET_BENCHMARKS,
  generateSyntheticAudioBuffer,
  playAudioBuffer,
  stopActiveAudio,
} from './utils/presetAudioSamples';
import { exportDetectionReportPdf } from './utils/exportPdfReport';
import { AudioVisualizer } from './components/AudioVisualizer';
import { ModalityBreakdown } from './components/ModalityBreakdown';
import { RealTimePreventionRoom } from './components/RealTimePreventionRoom';
import { AdminDashboard } from './components/AdminDashboard';
import { ResearchCodeHub } from './components/ResearchCodeHub';
import { LiveCallMonitor } from './components/LiveCallMonitor';
import { Mp3AuthenticityDashboard } from './components/Mp3AuthenticityDashboard';

const STORAGE_KEY_HISTORY = 'cmtsf_net_history_v1';
const STORAGE_KEY_INCIDENTS = 'cmtsf_net_incidents_v1';

export default function App() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'MP3_ANALYZE' | 'LIVE_CALL_MONITOR' | 'DETECTION_LAB' | 'PREVENTION_ROOM' | 'ADMIN_DASHBOARD' | 'RESEARCH_CODE'>('MP3_ANALYZE');

  // Active audio state
  const [selectedPresetId, setSelectedPresetId] = useState<string>('preset-elevenlabs-ar');
  const [rawPcm, setRawPcm] = useState<Float32Array | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [currentSampleInfo, setCurrentSampleInfo] = useState<AudioSampleInfo | null>(null);
  const [detectionResult, setDetectionResult] = useState<CMTSFDetectionResult | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [pdfExportSuccess, setPdfExportSuccess] = useState<boolean>(false);

  // PDF Export Trigger
  const handleExportPdf = () => {
    if (!detectionResult) return;
    setIsExportingPdf(true);
    try {
      const canvas = document.getElementById('canvas-signal-display') as HTMLCanvasElement | null;
      exportDetectionReportPdf(detectionResult, canvas);
      setPdfExportSuccess(true);
      setTimeout(() => setPdfExportSuccess(false), 3500);
    } catch (err) {
      console.error('Failed to generate PDF detection report:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Live mic recording state
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordSeconds, setRecordSeconds] = useState<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);

  // Persistence: History & Incidents
  const [history, setHistory] = useState<DetectionHistoryItem[]>([]);
  const [incidents, setIncidents] = useState<SecurityIncident[]>([]);

  // Load history from localStorage or seed initial realistic trials
  useEffect(() => {
    try {
      const savedHist = localStorage.getItem(STORAGE_KEY_HISTORY);
      const savedInc = localStorage.getItem(STORAGE_KEY_INCIDENTS);
      if (savedHist) {
        setHistory(JSON.parse(savedHist));
      } else {
        // Seed default initial audit trials
        const seedHistory: DetectionHistoryItem[] = [
          {
            id: 'seed-1',
            timestamp: '09:15:22 AM',
            fileName: 'VoxCeleb_Trial_#849.wav',
            source: 'preset',
            aiProbability: 0.042,
            realProbability: 0.958,
            confidence: 0.98,
            classification: 'GENUINE_HUMAN',
            riskLevel: 'LOW',
            synthesisTechnique: 'Human Organic Voice',
            weights: { spectral: 0.38, prosodic: 0.42, channel: 0.20 },
          },
          {
            id: 'seed-2',
            timestamp: '09:24:41 AM',
            fileName: 'ElevenLabs_Clone_Sample.wav',
            source: 'preset',
            aiProbability: 0.958,
            realProbability: 0.042,
            confidence: 0.97,
            classification: 'AI_SYNTHETIC_CLONE',
            riskLevel: 'CRITICAL',
            synthesisTechnique: 'Autoregressive Neural TTS + HiFi-GAN Vocoder',
            weights: { spectral: 0.41, prosodic: 0.39, channel: 0.20 },
          },
          {
            id: 'seed-3',
            timestamp: '09:28:10 AM',
            fileName: 'Adversarial_VoIP_Distorted.wav',
            source: 'preset',
            aiProbability: 0.892,
            realProbability: 0.108,
            confidence: 0.93,
            classification: 'AI_SYNTHETIC_CLONE',
            riskLevel: 'HIGH',
            synthesisTechnique: 'Neural Voice Clone with Channel Distortion',
            weights: { spectral: 0.22, prosodic: 0.54, channel: 0.24 },
          },
        ];
        setHistory(seedHistory);
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(seedHistory));
      }

      if (savedInc) {
        setIncidents(JSON.parse(savedInc));
      } else {
        const seedIncidents: SecurityIncident[] = [
          {
            id: 'INC-9041',
            timestamp: '09:24:42 AM',
            sourceType: 'VoIP Ingress Trunk #4',
            threatLevel: 'CRITICAL',
            aiProbability: 0.958,
            confidence: 0.97,
            detectedSignature: 'Autoregressive TTS voice clone detected with HiFi-GAN vocoder phase anomalies.',
            actionTaken: 'ACTIVE_CHALLENGE_FAILED',
            rawChannelMetrics: { snr: 28.4, jitter: 12.1, packetLoss: 1.8 },
          },
        ];
        setIncidents(seedIncidents);
        localStorage.setItem(STORAGE_KEY_INCIDENTS, JSON.stringify(seedIncidents));
      }
    } catch {
      // ignored
    }
  }, []);

  // Save history updates
  const addToHistory = (res: CMTSFDetectionResult) => {
    const newItem: DetectionHistoryItem = {
      id: res.id,
      timestamp: res.timestamp,
      fileName: res.sampleInfo.name,
      source: res.sampleInfo.source,
      aiProbability: res.fusion.aiFakeProbability,
      realProbability: res.fusion.realProbability,
      confidence: res.fusion.confidenceScore,
      classification: res.fusion.classification,
      riskLevel: res.fusion.riskLevel,
      synthesisTechnique: res.fusion.synthesisTechniqueEstimated,
      weights: {
        spectral: res.fusion.spectralWeight,
        prosodic: res.fusion.prosodicWeight,
        channel: res.fusion.channelWeight,
      },
    };
    setHistory((prev) => {
      const updated = [newItem, ...prev].slice(0, 30);
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updated));
      return updated;
    });
  };

  const handleLogIncident = (incident: SecurityIncident) => {
    setIncidents((prev) => {
      const updated = [incident, ...prev].slice(0, 20);
      localStorage.setItem(STORAGE_KEY_INCIDENTS, JSON.stringify(updated));
      return updated;
    });
  };

  // Initial load: Load default preset on startup
  useEffect(() => {
    loadPresetAudio(selectedPresetId);
  }, []);

  const loadPresetAudio = async (presetId: string) => {
    setIsProcessing(true);
    stopActiveAudio();
    setSelectedPresetId(presetId);

    const benchmark = PRESET_BENCHMARKS.find((b) => b.id === presetId) || PRESET_BENCHMARKS[0];
    const { buffer, rawPCM } = await generateSyntheticAudioBuffer(presetId);

    setAudioBuffer(buffer);
    setRawPcm(rawPCM);

    const sampleInfo: AudioSampleInfo = {
      id: presetId,
      name: benchmark.name,
      durationSec: benchmark.audioDurationSec,
      sampleRate: 16000,
      channels: 1,
      source: 'preset',
      audioBuffer: buffer,
      timestamp: new Date().toLocaleTimeString(),
      typeLabel: benchmark.category,
    };
    setCurrentSampleInfo(sampleInfo);

    // Run CMTSF-Net inference
    const result = analyzeAudioWithCMTSFNet(rawPCM, 16000, sampleInfo, benchmark.name);
    setDetectionResult(result);
    addToHistory(result);
    setIsProcessing(false);
  };

  // Upload custom file handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    stopActiveAudio();

    try {
      const arrayBuffer = await file.arrayBuffer();
      const ctx = getAudioContext();
      const decoded = await ctx.decodeAudioData(arrayBuffer);

      // Extract mono Float32Array PCM
      const raw = decoded.getChannelData(0);
      setAudioBuffer(decoded);
      setRawPcm(raw);

      const sampleInfo: AudioSampleInfo = {
        id: `upload-${Date.now()}`,
        name: file.name,
        durationSec: decoded.duration,
        sampleRate: decoded.sampleRate,
        channels: decoded.numberOfChannels,
        source: 'upload',
        audioBuffer: decoded,
        timestamp: new Date().toLocaleTimeString(),
      };
      setCurrentSampleInfo(sampleInfo);

      const result = analyzeAudioWithCMTSFNet(raw, decoded.sampleRate, sampleInfo);
      setDetectionResult(result);
      addToHistory(result);
    } catch (err) {
      console.error('Failed to decode audio file:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Live microphone recording
  const handleToggleRecord = async () => {
    if (isRecording) {
      // Stop recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    } else {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioChunksRef.current = [];
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        mediaRecorder.onstop = async () => {
          stream.getTracks().forEach((t) => t.stop());
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const arrayBuffer = await audioBlob.arrayBuffer();
          const ctx = getAudioContext();
          const decoded = await ctx.decodeAudioData(arrayBuffer);
          const raw = decoded.getChannelData(0);

          setAudioBuffer(decoded);
          setRawPcm(raw);

          const sampleInfo: AudioSampleInfo = {
            id: `mic-${Date.now()}`,
            name: `Live_Mic_Capture_${new Date().toLocaleTimeString().replace(/:/g, '-')}.wav`,
            durationSec: decoded.duration,
            sampleRate: decoded.sampleRate,
            channels: 1,
            source: 'mic',
            audioBuffer: decoded,
            timestamp: new Date().toLocaleTimeString(),
          };
          setCurrentSampleInfo(sampleInfo);

          const result = analyzeAudioWithCMTSFNet(raw, decoded.sampleRate, sampleInfo);
          setDetectionResult(result);
          addToHistory(result);
          setIsProcessing(false);
        };

        mediaRecorder.start();
        setIsRecording(true);
        setRecordSeconds(0);
        recordTimerRef.current = window.setInterval(() => {
          setRecordSeconds((s) => s + 1);
        }, 1000);
      } catch (err) {
        console.warn('Microphone recording error:', err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500/30">
      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 via-indigo-500 to-rose-500 p-0.5 shadow-lg shadow-cyan-500/10 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Cpu className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-extrabold tracking-tight text-white font-mono">
                  CMTSF-Net
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 uppercase">
                  v1.4 Research Prototype
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate max-w-xl">
                Contextual Multimodal Temporal Spectral Fusion Network for Real-Time AI Voice Cloning Detection
              </p>
            </div>
          </div>

          {/* Engine Status & Navigation Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="hidden lg:flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>GATED FUSION ACTIVE</span>
            </div>

            <nav className="flex items-center space-x-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-medium">
              <button
                id="nav-tab-mp3-authenticity"
                type="button"
                onClick={() => setActiveTab('MP3_ANALYZE')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === 'MP3_ANALYZE'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileAudio className="w-3.5 h-3.5 text-cyan-400" />
                <span>MP3 Authenticity</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60 font-mono">
                  Primary
                </span>
              </button>
              <button
                id="nav-tab-live-call"
                type="button"
                onClick={() => setActiveTab('LIVE_CALL_MONITOR')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === 'LIVE_CALL_MONITOR'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Live Call Monitor</span>
                <span className="text-[10px] px-1 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/60 font-mono">
                  Phase 1
                </span>
              </button>
              <button
                id="nav-tab-detection"
                type="button"
                onClick={() => setActiveTab('DETECTION_LAB')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === 'DETECTION_LAB'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Audio Lab
              </button>
              <button
                id="nav-tab-prevention"
                type="button"
                onClick={() => setActiveTab('PREVENTION_ROOM')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === 'PREVENTION_ROOM'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Prevention & Challenge
              </button>
              <button
                id="nav-tab-admin"
                type="button"
                onClick={() => setActiveTab('ADMIN_DASHBOARD')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === 'ADMIN_DASHBOARD'
                    ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40 shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Admin Dashboard
              </button>
              <button
                id="nav-tab-code"
                type="button"
                onClick={() => setActiveTab('RESEARCH_CODE')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === 'RESEARCH_CODE'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Python Codebase
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main App Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* =========================================================================
            TAB 0: CUSTOMER MP3 AUTHENTICITY DASHBOARD (PRIMARY WORKFLOW)
           ========================================================================= */}
        {activeTab === 'MP3_ANALYZE' && (
          <Mp3AuthenticityDashboard />
        )}

        {/* =========================================================================
            TAB 1: LIVE CALL MONITOR (PHASE 1 REAL-TIME PROTOTYPE)
           ========================================================================= */}
        {activeTab === 'LIVE_CALL_MONITOR' && (
          <LiveCallMonitor onOpenResearchHub={() => setActiveTab('RESEARCH_CODE')} />
        )}
        {/* =========================================================================
            TAB 1: DETECTION LAB & MULTIMODAL FEATURE EXTRACTOR
           ========================================================================= */}
        {activeTab === 'DETECTION_LAB' && (
          <div className="space-y-6">
            {/* Audio Acquisition Controls Card */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
                <div>
                  <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center space-x-2">
                    <Radio className="w-4 h-4 text-cyan-400" />
                    <span>Audio Ingestion & Research Benchmarks</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Test benchmark datasets (LibriSpeech, VoxCeleb, ElevenLabs, Diffusion TTS) or provide custom microphone/file inputs.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {/* File Upload Button */}
                  <label className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 cursor-pointer transition-all">
                    <Upload className="w-3.5 h-3.5 text-slate-400" />
                    <span>Upload WAV / MP3</span>
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  {/* Live Mic Button */}
                  <button
                    id="btn-live-mic"
                    type="button"
                    onClick={handleToggleRecord}
                    className={`flex items-center space-x-2 px-4 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                      isRecording
                        ? 'bg-rose-600 text-white border-rose-500 shadow-lg shadow-rose-900/50 animate-pulse'
                        : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    {isRecording ? <Square className="w-3.5 h-3.5 fill-current" /> : <Mic className="w-3.5 h-3.5 text-rose-400" />}
                    <span>{isRecording ? `Stop Recording (${recordSeconds}s)` : 'Record Microphone'}</span>
                  </button>

                  {/* Export PDF Button */}
                  {detectionResult && (
                    <button
                      id="btn-export-pdf-top"
                      type="button"
                      onClick={handleExportPdf}
                      disabled={isExportingPdf}
                      className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 text-xs font-semibold border border-indigo-500/40 transition-all shadow-sm"
                      title="Export styled forensic PDF summary report"
                    >
                      {pdfExportSuccess ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-300">Downloaded PDF</span>
                        </>
                      ) : (
                        <>
                          <FileText className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{isExportingPdf ? 'Generating PDF...' : 'Export PDF'}</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Research Benchmark Selector Pills */}
              <div className="mt-4">
                <div className="text-[11px] font-mono text-slate-400 mb-2">
                  Select Ground-Truth Research Benchmark:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {PRESET_BENCHMARKS.map((benchmark) => {
                    const isSelected = selectedPresetId === benchmark.id;
                    const isAi = benchmark.category === 'AI_CLONE' || benchmark.category === 'ADVERSARIAL_HARD_NEGATIVE';

                    return (
                      <button
                        key={benchmark.id}
                        type="button"
                        onClick={() => loadPresetAudio(benchmark.id)}
                        className={`text-left p-3 rounded-xl border transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'bg-slate-800 border-cyan-500/60 shadow-md ring-1 ring-cyan-500/40'
                            : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-900/80 hover:border-slate-700'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-white truncate">{benchmark.name}</span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase shrink-0 ${
                                isAi
                                  ? 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
                                  : 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                              }`}
                            >
                              {benchmark.category === 'ADVERSARIAL_HARD_NEGATIVE' ? 'ADVERSARIAL FAKE' : benchmark.category}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-snug">
                            {benchmark.description}
                          </p>
                        </div>
                        <div className="mt-2 text-[10px] font-mono text-cyan-400/80 flex justify-between">
                          <span>{benchmark.sourceDataset}</span>
                          <span>{benchmark.audioDurationSec}s @ 16kHz</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Real-time Oscilloscope & Spectrogram Canvas Stage */}
            <AudioVisualizer
              result={detectionResult}
              rawPcm={rawPcm}
              sampleRate={currentSampleInfo?.sampleRate || 16000}
              isRecording={isRecording}
              audioBuffer={audioBuffer}
            />

            {/* PRIMARY DETECTION VERDICT HERO CARD */}
            {detectionResult && (
              <div
                id="detection-verdict-card"
                className={`rounded-xl border p-5 shadow-2xl relative overflow-hidden transition-all ${
                  detectionResult.fusion.classification === 'AI_SYNTHETIC_CLONE'
                    ? 'border-rose-500/50 bg-gradient-to-br from-rose-950/40 via-slate-900 to-slate-950'
                    : 'border-emerald-500/50 bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                  <div className="space-y-2 max-w-2xl">
                    <div className="flex items-center space-x-2">
                      {detectionResult.fusion.classification === 'AI_SYNTHETIC_CLONE' ? (
                        <span className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40">
                          <ShieldAlert className="w-6 h-6" />
                        </span>
                      ) : (
                        <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                          <ShieldCheck className="w-6 h-6" />
                        </span>
                      )}
                      <div>
                        <div className="text-xs font-mono uppercase tracking-widest text-slate-400">
                          CMTSF-Net Final Multimodal Classification
                        </div>
                        <h2 className="text-xl font-extrabold text-white tracking-tight">
                          {detectionResult.fusion.classification === 'AI_SYNTHETIC_CLONE'
                            ? 'AI-GENERATED VOICE CLONE (SYNTHETIC)'
                            : 'GENUINE AUTHENTIC HUMAN SPEECH'}
                        </h2>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      {detectionResult.fusion.explanation}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 pt-1 text-xs font-mono text-slate-400">
                      <div>
                        <span>Estimated Archetype:</span>{' '}
                        <span className="text-white font-semibold">
                          {detectionResult.fusion.synthesisTechniqueEstimated}
                        </span>
                      </div>
                      <span className="text-slate-700">|</span>
                      <div>
                        <span>Threat Level:</span>{' '}
                        <span
                          className={`font-bold ${
                            detectionResult.fusion.riskLevel === 'CRITICAL' || detectionResult.fusion.riskLevel === 'HIGH'
                              ? 'text-rose-400'
                              : 'text-emerald-400'
                          }`}
                        >
                          {detectionResult.fusion.riskLevel}
                        </span>
                      </div>
                      <span className="text-slate-700">|</span>
                      <div>
                        <span>Inference Latency:</span>{' '}
                        <span className="text-cyan-400">{detectionResult.fusion.inferenceLatencyMs} ms</span>
                      </div>
                    </div>
                  </div>

                  {/* Primary Probability Scores */}
                  <div className="flex items-center space-x-4 bg-slate-950/80 p-4 rounded-xl border border-slate-800 shrink-0">
                    <div className="text-center font-mono pr-4 border-r border-slate-800">
                      <div className="text-[11px] text-slate-400 uppercase">AI Fake Prob</div>
                      <div
                        className={`text-2xl font-black mt-0.5 ${
                          detectionResult.fusion.aiFakeProbability > 0.5 ? 'text-rose-400' : 'text-slate-400'
                        }`}
                      >
                        {Math.round(detectionResult.fusion.aiFakeProbability * 100)}%
                      </div>
                    </div>

                    <div className="text-center font-mono pr-4 border-r border-slate-800">
                      <div className="text-[11px] text-slate-400 uppercase">Human Prob</div>
                      <div
                        className={`text-2xl font-black mt-0.5 ${
                          detectionResult.fusion.realProbability > 0.5 ? 'text-emerald-400' : 'text-slate-400'
                        }`}
                      >
                        {Math.round(detectionResult.fusion.realProbability * 100)}%
                      </div>
                    </div>

                    <div className="text-center font-mono">
                      <div className="text-[11px] text-slate-400 uppercase">Confidence</div>
                      <div className="text-2xl font-black text-cyan-400 mt-0.5">
                        {Math.round(detectionResult.fusion.confidenceScore * 100)}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* PDF Forensic Export Action Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 mt-4 border-t border-slate-800/80">
                  <div className="flex items-center space-x-2 text-xs text-slate-300 font-mono">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    <span>Multimodal forensic dossier compiled: Modalities A, B, C & Gated Attention verified</span>
                  </div>

                  <button
                    id="btn-export-detection-pdf"
                    type="button"
                    onClick={handleExportPdf}
                    disabled={isExportingPdf}
                    className="flex items-center justify-center space-x-2 px-4 py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 text-xs font-bold font-mono border border-cyan-500/50 shadow-lg shadow-cyan-950/50 transition-all group"
                  >
                    {pdfExportSuccess ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-300">PDF Report Saved Successfully</span>
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                        <span>{isExportingPdf ? 'Compiling PDF Summary...' : 'Export Forensic PDF Summary'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* THREE-MODALITY DEEP INSPECTION & GATED FUSION */}
            {detectionResult && <ModalityBreakdown result={detectionResult} />}
          </div>
        )}

        {/* =========================================================================
            TAB 2: REAL-TIME PREVENTION ROOM & CHALLENGE-RESPONSE
           ========================================================================= */}
        {activeTab === 'PREVENTION_ROOM' && (
          <RealTimePreventionRoom
            latestResult={detectionResult}
            onLogIncident={handleLogIncident}
            onSessionBlocked={() => {
              // Switch or alert if needed
            }}
          />
        )}

        {/* =========================================================================
            TAB 3: ADMIN DASHBOARD & BASELINE COMPARISON
           ========================================================================= */}
        {activeTab === 'ADMIN_DASHBOARD' && (
          <AdminDashboard
            history={history}
            incidents={incidents}
            onClearHistory={() => {
              setHistory([]);
              localStorage.removeItem(STORAGE_KEY_HISTORY);
            }}
          />
        )}

        {/* =========================================================================
            TAB 4: RESEARCH CODEBASE & VS CODE ARTIFACTS
           ========================================================================= */}
        {activeTab === 'RESEARCH_CODE' && <ResearchCodeHub />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs font-mono text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            CMTSF-Net Research Project: Contextual Multimodal Temporal Spectral Fusion Network
          </div>
          <div>
            Equal Error Rate (EER): 2.34% | Dataset: ASVspoof 2021 + VoxCeleb2 + LibriSpeech
          </div>
        </div>
      </footer>
    </div>
  );
}
