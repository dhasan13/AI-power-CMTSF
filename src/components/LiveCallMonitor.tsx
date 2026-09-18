import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Radio,
  Clock,
  Layers,
  Sparkles,
  RefreshCw,
  Terminal,
  Info,
  CheckCircle2,
  Lock,
  Sliders,
  Play,
  Square,
  Shield,
  AlertCircle,
  Activity,
  ArrowRight,
} from 'lucide-react';
import {
  LiveCallStreamStatus,
  SlidingBufferTelemetry,
  LiveWindowInference,
  LiveVoiceAuthenticityResult,
  LocationInfo,
  TimelineEntry,
  ThresholdConfig,
} from '../types/cmtsf';
import { LiveCallAudioStreamer } from '../utils/liveCallStreamer';
import { CombinedLiveMonitoringCard } from './CombinedLiveMonitoringCard';
import { RealTimeTimelineChart } from './RealTimeTimelineChart';
import { LocationPanel } from './LocationPanel';

interface LiveCallMonitorProps {
  onOpenResearchHub?: () => void;
}

export const LiveCallMonitor: React.FC<LiveCallMonitorProps> = ({ onOpenResearchHub }) => {
  // Stream state
  const [streamStatus, setStreamStatus] = useState<LiveCallStreamStatus>('DISCONNECTED');
  const [statusMessage, setStatusMessage] = useState<string>('Ready to start live voice authenticity monitoring.');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Audio level meters
  const [audioLevel, setAudioLevel] = useState<{ rms: number; peak: number }>({ rms: 0, peak: 0 });

  // Thresholds (Default: 0-40 Low, 40-65 Suspicious, 65-85 High, 85-100 Critical)
  const [thresholds, setThresholds] = useState<ThresholdConfig>({
    lowMax: 40,
    suspiciousMax: 65,
    highMax: 85,
  });

  // Sliding buffer telemetry
  const [bufferTelemetry, setBufferTelemetry] = useState<SlidingBufferTelemetry>({
    bufferedSamples: 0,
    bufferedSeconds: 0,
    windowDurationSec: 4.0,
    strideDurationSec: 1.0,
    fillPercentage: 0,
    isReady: false,
    totalChunksReceived: 0,
    windowsEmitted: 0,
    streamDurationSec: 0,
    currentWindowRange: 'Idle',
  });

  // Authenticity & Timeline State
  const [authenticityResult, setAuthenticityResult] = useState<LiveVoiceAuthenticityResult | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [recentEvents, setRecentEvents] = useState<string[]>([
    'System initialized with calibrated CMTSF-Net weights',
    'Sliding analysis window configured to 4.0s (1.0s stride)',
  ]);

  // Location State (Independent Channel)
  const [location, setLocation] = useState<LocationInfo | null>(null);

  // Endpoint settings
  const [wsUrl, setWsUrl] = useState<string>('ws://localhost:8000/ws/live-analysis');
  const [showConfig, setShowConfig] = useState<boolean>(false);
  const [showTerminalModal, setShowTerminalModal] = useState<boolean>(false);

  // Streamer instance ref & visualizer refs
  const streamerRef = useRef<LiveCallAudioStreamer | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Initialize streamer
  useEffect(() => {
    streamerRef.current = new LiveCallAudioStreamer(
      {
        onStatusChange: (status, msg) => {
          setStreamStatus(status);
          if (msg) setStatusMessage(msg);
          if (status === 'ERROR' && msg) setErrorMessage(msg);
          if (status === 'CONNECTED' || status === 'MONITORING') setErrorMessage(null);
        },
        onBufferUpdate: (telemetry) => {
          setBufferTelemetry(telemetry);
        },
        onInferenceResult: (_res) => {
          // Handled via onAuthenticityResult
        },
        onAuthenticityResult: (res) => {
          setAuthenticityResult(res);

          const timeStr = new Date(res.timestamp).toLocaleTimeString('en-US', {
            hour12: false,
          });

          const entry: TimelineEntry = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            time: timeStr,
            timestamp: res.timestamp,
            verdict: res.verdict,
            confidence: res.confidence,
            ai_probability: res.ai_probability,
            human_probability: res.human_probability,
            risk_level: res.risk_level,
          };

          setTimeline((prev) => {
            const updated = [...prev, entry];
            return updated.slice(-30); // maintain last 30 analysis windows
          });

          // Log dynamic events based on audio features
          if (res.risk_level === 'High' || res.risk_level === 'Critical') {
            setRecentEvents((prev) => [
              `[${timeStr}] High-risk voice pattern detected (${(res.ai_probability * 100).toFixed(0)}% AI prob)`,
              ...prev.slice(0, 4),
            ]);
          } else if (res.verdict === 'Suspicious / Inconclusive') {
            setRecentEvents((prev) => [
              `[${timeStr}] Inconclusive confidence (${res.confidence}%) — human verification advised`,
              ...prev.slice(0, 4),
            ]);
          } else if (res.prosodic_score > 0.6) {
            setRecentEvents((prev) => [
              `[${timeStr}] Natural pitch variation changed — atypical cadence logged`,
              ...prev.slice(0, 4),
            ]);
          }
        },
        onAudioLevel: (rms, peak) => {
          setAudioLevel({ rms, peak });
        },
        onError: (err) => {
          setErrorMessage(err);
        },
      },
      wsUrl,
      thresholds
    );

    return () => {
      if (streamerRef.current) {
        streamerRef.current.stop();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [wsUrl]);

  // Update streamer when thresholds change
  useEffect(() => {
    if (streamerRef.current) {
      streamerRef.current.setThresholds(thresholds);
    }
  }, [thresholds]);

  // Live Oscilloscope Canvas Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;

    const render = () => {
      if (!running) return;

      const width = canvas.width;
      const height = canvas.height;

      // Dark background
      ctx.fillStyle = '#050811';
      ctx.fillRect(0, 0, width, height);

      // Horizontal center line
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      const analyser = streamerRef.current?.getAnalyser();
      if (analyser && streamStatus !== 'DISCONNECTED') {
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteTimeDomainData(dataArray);

        ctx.lineWidth = 2;
        ctx.strokeStyle = '#06b6d4'; // Cyan neon
        ctx.beginPath();

        const sliceWidth = (width * 1.0) / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * height) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }

          x += sliceWidth;
        }

        ctx.lineTo(width, height / 2);
        ctx.stroke();
      } else {
        // Idle flatline
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      running = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [streamStatus]);

  // Controls
  const handleStartStream = async () => {
    setErrorMessage(null);
    if (streamerRef.current) {
      await streamerRef.current.start();
    }
  };

  const handleStopStream = () => {
    if (streamerRef.current) {
      streamerRef.current.stop();
    }
    setStreamStatus('DISCONNECTED');
    setStatusMessage('Monitoring stopped. Audio buffer purged.');
  };

  const handleResetSession = () => {
    handleStopStream();
    setBufferTelemetry({
      bufferedSamples: 0,
      bufferedSeconds: 0,
      windowDurationSec: 4.0,
      strideDurationSec: 1.0,
      fillPercentage: 0,
      isReady: false,
      totalChunksReceived: 0,
      windowsEmitted: 0,
      streamDurationSec: 0,
      currentWindowRange: 'Idle',
    });
    setAuthenticityResult(null);
    setTimeline([]);
    setRecentEvents([
      'Session reset. Buffer cleared.',
      'Ready for new audio stream.',
    ]);
  };

  const isStreaming =
    streamStatus === 'CONNECTED' ||
    streamStatus === 'BUFFERING' ||
    streamStatus === 'MONITORING';

  return (
    <div id="live-voice-authenticity-dashboard" className="space-y-6">
      {/* 1. Audio Pipeline Architectural Flowchart */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 shadow-xl overflow-x-auto">
        <div className="flex items-center justify-between gap-4 mb-2">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
              CMTSF-Net Real-Time Audio Pipeline
            </span>
          </div>
          <span className="text-[11px] font-mono text-cyan-400">
            1-second update cycle • 4.0s sliding window
          </span>
        </div>

        <div className="flex items-center gap-2 min-w-[760px] text-[10px] font-mono text-slate-300 py-1">
          <div className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-center shrink-0">
            <span className="text-cyan-400 font-bold block">Browser Mic</span>
            <span className="text-[9px] text-slate-500">Authorized Stream</span>
          </div>
          <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />

          <div className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-center shrink-0">
            <span className="text-slate-200 font-bold block">1s Audio Chunks</span>
            <span className="text-[9px] text-slate-500">16,000 samples</span>
          </div>
          <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />

          <div className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-center shrink-0">
            <span className="text-indigo-300 font-bold block">WebSocket</span>
            <span className="text-[9px] text-slate-500">/ws/live-analysis</span>
          </div>
          <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />

          <div className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-center shrink-0">
            <span className="text-slate-200 font-bold block">4s Sliding Window</span>
            <span className="text-[9px] text-slate-500">1s stride</span>
          </div>
          <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />

          <div className="px-2.5 py-1 rounded bg-cyan-950/40 border border-cyan-800 text-center shrink-0">
            <span className="text-cyan-300 font-bold block">Spectral CNN</span>
            <span className="text-[9px] text-slate-500">Artifacts</span>
          </div>

          <div className="px-2.5 py-1 rounded bg-indigo-950/40 border border-indigo-800 text-center shrink-0">
            <span className="text-indigo-300 font-bold block">Prosodic TCN</span>
            <span className="text-[9px] text-slate-500">F0 & Jitter</span>
          </div>

          <div className="px-2.5 py-1 rounded bg-amber-950/40 border border-amber-800 text-center shrink-0">
            <span className="text-amber-300 font-bold block">Channel Model</span>
            <span className="text-[9px] text-slate-500">SNR & Noise</span>
          </div>
          <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />

          <div className="px-2.5 py-1 rounded bg-emerald-950/40 border border-emerald-800 text-center shrink-0">
            <span className="text-emerald-300 font-bold block">Gated Fusion</span>
            <span className="text-[9px] text-slate-500">Attentive</span>
          </div>
          <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />

          <div className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-center shrink-0">
            <span className="text-slate-200 font-bold block">Temporal Risk</span>
            <span className="text-[9px] text-slate-500">EMA Smoothing</span>
          </div>
          <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />

          <div className="px-2.5 py-1 rounded bg-cyan-950 border border-cyan-700 text-center shrink-0">
            <span className="text-cyan-300 font-bold block">Live Dashboard</span>
            <span className="text-[9px] text-cyan-500">Real-Time UI</span>
          </div>
        </div>
      </div>

      {/* 2. Stream Controls & Oscilloscope Bar */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                STREAM STATUS:
              </span>
              <span
                className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold uppercase ${
                  streamStatus === 'MONITORING'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                    : streamStatus === 'BUFFERING'
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-700 animate-pulse'
                    : streamStatus === 'CONNECTED'
                    ? 'bg-blue-950 text-blue-300 border border-blue-700'
                    : streamStatus === 'CONNECTING'
                    ? 'bg-amber-950 text-amber-300 border border-amber-700 animate-pulse'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {streamStatus}
              </span>
              <span className="text-xs text-slate-400 font-mono">• {statusMessage}</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Ephemeral in-memory processing. Audio chunks are deleted immediately after sliding inference.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3 shrink-0">
            {!isStreaming ? (
              <button
                id="btn-start-live-monitoring"
                type="button"
                onClick={handleStartStream}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold shadow-lg shadow-emerald-900/20 transition-all cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>START MONITORING</span>
              </button>
            ) : (
              <button
                id="btn-stop-live-monitoring"
                type="button"
                onClick={handleStopStream}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold shadow-lg shadow-rose-900/20 transition-all cursor-pointer"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>STOP MONITORING</span>
              </button>
            )}

            <button
              id="btn-reset-session"
              type="button"
              onClick={handleResetSession}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 transition-colors cursor-pointer"
              title="Reset session & buffer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setShowConfig(!showConfig)}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 transition-colors cursor-pointer"
              title="WebSocket Endpoint Settings"
            >
              <Sliders className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* WebSocket Config Popover */}
        {showConfig && (
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center gap-3 text-xs font-mono">
            <span className="text-slate-400">WebSocket Endpoint:</span>
            <input
              type="text"
              value={wsUrl}
              onChange={(e) => setWsUrl(e.target.value)}
              disabled={isStreaming}
              className="flex-1 px-3 py-1.5 rounded bg-slate-900 border border-slate-700 text-cyan-300 focus:outline-none focus:border-cyan-500 disabled:opacity-50"
              placeholder="ws://localhost:8000/ws/live-analysis"
            />
            <span className="text-[11px] text-slate-500">
              Default: /ws/live-analysis
            </span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Oscilloscope Canvas */}
        <div className="relative rounded-lg overflow-hidden border border-slate-800 bg-[#050811]">
          <canvas ref={canvasRef} width={900} height={70} className="w-full h-16 block" />
          <div className="absolute top-2 left-3 flex items-center space-x-2 text-[10px] font-mono text-slate-400 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>LIVE 16 kHz WAVEFORM</span>
          </div>
          <div className="absolute top-2 right-3 text-[10px] font-mono text-slate-400 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800">
            RMS: {(audioLevel.rms * 100).toFixed(1)}% | Peak: {(audioLevel.peak * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      {/* 3. Combined Live Monitoring Card (Section 5) */}
      <CombinedLiveMonitoringCard
        result={authenticityResult}
        location={location}
        isStreaming={isStreaming}
        thresholds={thresholds}
        onThresholdsChange={setThresholds}
        recentEvents={recentEvents}
      />

      {/* 4. Two-Column Row: AI Probability Timeline & Dedicated Location Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Timeline & Chart (7 Cols) */}
        <div className="lg:col-span-7">
          <RealTimeTimelineChart timeline={timeline} />
        </div>

        {/* Right Column: Dedicated Location Panel (5 Cols) */}
        <div className="lg:col-span-5">
          <LocationPanel location={location} onLocationUpdate={setLocation} />
        </div>
      </div>

      {/* 5. Prototype Limitation Notice & Privacy Standards (Section 6 & 8) */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl space-y-3">
        <div className="flex items-center space-x-2">
          <Info className="w-4 h-4 text-cyan-400" />
          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
            Prototype Standards & Architecture Constraints
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono text-slate-400">
          <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1.5">
            <span className="text-slate-300 font-semibold block">
              1. Prototype Audio Ingress Notice
            </span>
            <p className="text-[11px] leading-relaxed text-slate-400">
              For this prototype, browser microphone streaming is implemented instead of direct cellular phone interception.
              <strong className="text-slate-300 block mt-1">
                Telecom Architecture Note:
              </strong>
              Real telephone-network integration requires authorized PBX, SIP, or telecom carrier infrastructure and must not be simulated as if browser audio can access cellular baseband packets.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1.5">
            <span className="text-slate-300 font-semibold block">
              2. Strict Privacy & Biometric Non-Inference
            </span>
            <p className="text-[11px] leading-relaxed text-slate-400">
              • Location is strictly gathered from user-permitted client GPS/IP and is <strong className="text-amber-300">never inferred from voice characteristics</strong>.
              <br />• Voice analysis strictly detects synthetic generation artifacts; it does not identify persons, ethnicity, gender, or health.
              <br />• Raw audio is processed ephemerally in 4s RAM buffers and permanently deleted.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
