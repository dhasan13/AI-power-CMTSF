import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Radio,
  Sliders,
  Sparkles,
  MapPin,
  Clock,
  Waves,
  Activity,
  CheckCircle2,
  Lock,
  Layers,
  Info,
  ChevronDown,
  ChevronUp,
  Crosshair,
  Eye,
  EyeOff,
  Navigation,
} from 'lucide-react';
import {
  LiveVoiceAuthenticityResult,
  LocationInfo,
  ThresholdConfig,
} from '../types/cmtsf';
import { MapComponent } from './MapComponent';

interface CombinedLiveMonitoringCardProps {
  result: LiveVoiceAuthenticityResult | null;
  location: LocationInfo | null;
  isStreaming: boolean;
  thresholds: ThresholdConfig;
  onThresholdsChange: (newThresholds: ThresholdConfig) => void;
  recentEvents: string[];
  onStopLocationSharing?: () => void;
}

export const CombinedLiveMonitoringCard: React.FC<CombinedLiveMonitoringCardProps> = ({
  result,
  location,
  isStreaming,
  thresholds,
  onThresholdsChange,
  recentEvents,
  onStopLocationSharing,
}) => {
  const [showThresholdConfig, setShowThresholdConfig] = useState<boolean>(false);
  const [showMap, setShowMap] = useState<boolean>(true);

  // Default values when idle
  const verdict = result?.verdict || 'Awaiting Audio Stream';
  const confidence = result ? Math.round(result.confidence) : 0;
  const aiProb = result ? Math.round(result.ai_probability * 100) : 0;
  const humanProb = result ? Math.round(result.human_probability * 100) : 0;
  const riskLevel = result?.risk_level || 'Low';
  const spectralScore = result ? Math.round(result.spectral_score * 100) : 0;
  const prosodicScore = result ? Math.round(result.prosodic_score * 100) : 0;
  const channelScore = result ? Math.round(result.channel_score * 100) : 0;
  const audioQuality = result ? Math.round(result.audio_quality) : 0;
  const timestamp = result?.timestamp
    ? new Date(result.timestamp).toLocaleTimeString()
    : '--:--:--';
  const duration = result?.analysis_duration || '4.0s';
  const mode = result?.mode || 'Trained Model';

  const isAi = verdict === 'Likely AI-Generated Voice';
  const isHuman = verdict === 'Likely Human Voice';
  const isInconclusive = verdict === 'Suspicious / Inconclusive';

  const handleSliderChange = (key: keyof ThresholdConfig, val: number) => {
    onThresholdsChange({
      ...thresholds,
      [key]: val,
    });
  };

  const handleResetThresholds = () => {
    onThresholdsChange({
      lowMax: 40,
      suspiciousMax: 65,
      highMax: 85,
    });
  };

  return (
    <div
      id="combined-live-monitoring-card"
      className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-2xl backdrop-blur-sm"
    >
      {/* 1. Header Banner */}
      <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-cyan-950 border border-cyan-800/80 flex items-center justify-center text-cyan-400">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-mono font-extrabold tracking-wide text-white uppercase">
              CMTSF-Net LIVE VOICE AUTHENTICITY MONITOR
            </h2>
            <p className="text-[11px] text-slate-400">
              Contextual Multimodal Temporal Spectral Fusion Network • 4-second sliding analysis
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {mode === 'Trained Model' ? (
            <span className="px-2.5 py-1 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 text-[10px] font-mono uppercase tracking-wider flex items-center gap-1.5 font-bold">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span>Trained Model (Validated)</span>
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-md bg-amber-950/80 text-amber-300 border border-amber-700/60 text-[10px] font-mono uppercase tracking-wider font-bold">
              DEMO MODE — NOT VALIDATED
            </span>
          )}

          {isStreaming && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-950/80 border border-red-800 text-red-400 text-[10px] font-mono font-bold uppercase animate-pulse">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span>REC LIVE</span>
            </span>
          )}
        </div>
      </div>

      {/* 2. Main Two-Column Split: Voice Result & Location */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
        {/* Left Column: Voice Result (7 Cols) */}
        <div className="lg:col-span-7 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">
              VOICE AUTHENTICITY
            </span>
            <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-500" />
              <span>Updated: {timestamp}</span>
            </span>
          </div>

          {/* Verdict Box */}
          <div
            className={`p-5 rounded-xl border transition-all ${
              !isStreaming && !result
                ? 'bg-slate-950/60 border-slate-800 text-slate-400'
                : isAi
                ? 'bg-rose-950/30 border-rose-600/60 shadow-lg shadow-rose-950/30'
                : isHuman
                ? 'bg-emerald-950/30 border-emerald-600/60 shadow-lg shadow-emerald-950/30'
                : 'bg-amber-950/30 border-amber-600/60 shadow-lg shadow-amber-950/30'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-mono font-semibold tracking-wider text-slate-400 block">
                  Primary Verdict
                </span>
                <div className="flex items-center space-x-2.5">
                  {isAi && <ShieldAlert className="w-6 h-6 text-rose-400 shrink-0" />}
                  {isHuman && <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />}
                  {isInconclusive && <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />}
                  {!result && <Radio className="w-6 h-6 text-slate-500 shrink-0" />}

                  <h3
                    className={`text-xl font-extrabold tracking-tight ${
                      isAi
                        ? 'text-rose-200'
                        : isHuman
                        ? 'text-emerald-200'
                        : isInconclusive
                        ? 'text-amber-200'
                        : 'text-slate-300'
                    }`}
                  >
                    {verdict}
                  </h3>
                </div>
              </div>

              {/* Risk Level Badge */}
              <div className="text-right">
                <span className="text-[10px] uppercase font-mono font-semibold text-slate-400 block">
                  Risk Level
                </span>
                <span
                  className={`inline-block px-3 py-1 rounded-md text-xs font-mono font-bold uppercase mt-1 border ${
                    riskLevel === 'Low'
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                      : riskLevel === 'Suspicious'
                      ? 'bg-amber-950 text-amber-300 border-amber-700'
                      : riskLevel === 'High'
                      ? 'bg-rose-950 text-rose-300 border-rose-700'
                      : 'bg-red-950 text-red-300 border-red-700 animate-pulse'
                  }`}
                >
                  {riskLevel}
                </span>
              </div>
            </div>

            {/* Metrics Row: Confidence, Risk Level, Modalities */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-4 pt-4 border-t border-slate-800/80 font-mono text-center">
              <div className="p-2 rounded bg-slate-900/60 border border-slate-800/50">
                <span className="text-[9px] uppercase text-slate-400 block">Confidence</span>
                <span className="text-sm font-bold text-white mt-0.5 block">
                  {confidence}%
                </span>
              </div>
              <div className="p-2 rounded bg-slate-900/60 border border-slate-800/50">
                <span className="text-[9px] uppercase text-slate-400 block">Risk Level</span>
                <span className={`text-sm font-bold mt-0.5 block ${
                  riskLevel === 'Low' ? 'text-emerald-400' : riskLevel === 'Suspicious' ? 'text-amber-400' : 'text-rose-400'
                }`}>
                  {riskLevel.toUpperCase()}
                </span>
              </div>
              <div className="p-2 rounded bg-slate-900/60 border border-slate-800/50">
                <span className="text-[9px] uppercase text-slate-400 block">Spectral</span>
                <span className="text-sm font-bold text-cyan-400 mt-0.5 block">
                  {spectralScore}%
                </span>
              </div>
              <div className="p-2 rounded bg-slate-900/60 border border-slate-800/50">
                <span className="text-[9px] uppercase text-slate-400 block">Prosodic</span>
                <span className="text-sm font-bold text-indigo-400 mt-0.5 block">
                  {prosodicScore}%
                </span>
              </div>
              <div className="p-2 rounded bg-slate-900/60 border border-slate-800/50">
                <span className="text-[9px] uppercase text-slate-400 block">Channel</span>
                <span className="text-sm font-bold text-amber-400 mt-0.5 block">
                  {channelScore}%
                </span>
              </div>
              <div className="p-2 rounded bg-slate-900/60 border border-slate-800/50">
                <span className="text-[9px] uppercase text-slate-400 block">Quality</span>
                <span className="text-sm font-bold text-emerald-400 mt-0.5 block">
                  {audioQuality}%
                </span>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-800/50">
              <span>Window: {duration} (16 kHz mono)</span>
              <span>Gated Attention Fusion Active</span>
            </div>
          </div>

          {/* Configurable Thresholds Accordion */}
          <div className="border border-slate-800 rounded-lg p-3 bg-slate-950/40">
            <button
              type="button"
              onClick={() => setShowThresholdConfig(!showThresholdConfig)}
              className="w-full flex items-center justify-between text-xs font-mono text-slate-300 hover:text-white"
            >
              <div className="flex items-center space-x-2">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                <span>Configurable Detection Thresholds</span>
              </div>
              {showThresholdConfig ? (
                <ChevronUp className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              )}
            </button>

            {showThresholdConfig && (
              <div className="mt-4 space-y-3 pt-3 border-t border-slate-800 text-xs font-mono">
                <div className="space-y-1">
                  <div className="flex justify-between text-slate-400 text-[11px]">
                    <span>Low Risk Maximum (0 – {thresholds.lowMax}%)</span>
                    <span className="text-emerald-400 font-bold">{thresholds.lowMax}%</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="50"
                    value={thresholds.lowMax}
                    onChange={(e) => handleSliderChange('lowMax', Number(e.target.value))}
                    className="w-full accent-cyan-500"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-slate-400 text-[11px]">
                    <span>Suspicious Maximum ({thresholds.lowMax} – {thresholds.suspiciousMax}%)</span>
                    <span className="text-amber-400 font-bold">{thresholds.suspiciousMax}%</span>
                  </div>
                  <input
                    type="range"
                    min={thresholds.lowMax + 5}
                    max="75"
                    value={thresholds.suspiciousMax}
                    onChange={(e) => handleSliderChange('suspiciousMax', Number(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-slate-400 text-[11px]">
                    <span>High Risk Maximum ({thresholds.suspiciousMax} – {thresholds.highMax}%)</span>
                    <span className="text-rose-400 font-bold">{thresholds.highMax}%</span>
                  </div>
                  <input
                    type="range"
                    min={thresholds.suspiciousMax + 5}
                    max="95"
                    value={thresholds.highMax}
                    onChange={(e) => handleSliderChange('highMax', Number(e.target.value))}
                    className="w-full accent-rose-500"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-[10px] text-slate-500">
                    Critical Risk triggers above {thresholds.highMax}%. Default validation calibration.
                  </span>
                  <button
                    type="button"
                    onClick={handleResetThresholds}
                    className="text-[10px] text-cyan-400 hover:underline"
                  >
                    Reset Defaults
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: GPS LOCATION (5 Cols) */}
        <div className="lg:col-span-5 p-6 space-y-4 bg-slate-950/40 font-mono">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-cyan-400" />
              <span>GPS LOCATION</span>
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
              Independent Telemetry
            </span>
          </div>

          {location ? (
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                <span className="text-slate-400">GPS Status:</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{location.status || 'Active'}</span>
                </span>
              </div>

              {location.latitude !== null && (
                <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">Latitude:</span>
                  <span className="text-white font-bold tracking-wide">{location.latitude}</span>
                </div>
              )}

              {location.longitude !== null && (
                <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">Longitude:</span>
                  <span className="text-white font-bold tracking-wide">{location.longitude}</span>
                </div>
              )}

              <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Accuracy:</span>
                <span className="text-slate-200 font-medium">
                  {Math.round(location.accuracy || location.accuracy_meters || 25)} m
                </span>
              </div>

              {location.approximate_location ? (
                <div className="py-2 border-b border-slate-800/80">
                  <span className="text-[10px] uppercase text-slate-500 block">Approximate Location:</span>
                  <span className="text-cyan-300 font-bold text-sm block mt-0.5">
                    {location.approximate_location}
                  </span>
                </div>
              ) : location.city ? (
                <div className="py-2 border-b border-slate-800/80">
                  <span className="text-[10px] uppercase text-slate-500 block">Approximate Location:</span>
                  <span className="text-cyan-300 font-bold text-sm block mt-0.5">
                    {[location.city, location.district, location.region || location.state, location.country]
                      .filter(Boolean)
                      .join(', ')}
                  </span>
                </div>
              ) : null}

              <div className="flex justify-between items-center text-[10px] text-slate-400 pt-0.5">
                <span>Updated: {location.timestamp}</span>
                <span className="text-slate-500">Source: {location.source}</span>
              </div>

              {/* Interactive Map */}
              {location.latitude !== null && location.longitude !== null && showMap && (
                <div className="pt-2">
                  <MapComponent
                    latitude={location.latitude}
                    longitude={location.longitude}
                    accuracy={location.accuracy || location.accuracy_meters}
                    locationName={location.approximate_location || `Lat: ${location.latitude}, Lng: ${location.longitude}`}
                    height="180px"
                    zoom={14}
                  />
                </div>
              )}

              {/* Action Buttons: [Interactive Map] [Stop Location Sharing] */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/60">
                <button
                  type="button"
                  onClick={() => setShowMap(!showMap)}
                  className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Crosshair className="w-3 h-3" />
                  <span>{showMap ? 'Hide Map' : 'Interactive Map'}</span>
                </button>

                {onStopLocationSharing && (
                  <button
                    type="button"
                    onClick={onStopLocationSharing}
                    className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-rose-950/40 hover:bg-rose-900 text-rose-300 border border-rose-800 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Navigation className="w-3 h-3" />
                    <span>Stop Location Sharing</span>
                  </button>
                )}
              </div>

              <div className="text-[10px] text-slate-500 italic pt-1 border-t border-slate-800/40">
                Privacy: Location is collected only after user permission. Location is never inferred from voice analysis.
              </div>
            </div>
          ) : (
            <div className="p-5 rounded-xl border border-dashed border-slate-800 bg-slate-900/40 text-center space-y-2.5">
              <Lock className="w-5 h-5 text-slate-600 mx-auto" />
              <p className="text-xs font-semibold text-slate-300">
                Location unavailable.
              </p>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Please allow browser location permission if location display is required.
              </p>
              <div className="text-[10px] text-slate-500 pt-1">
                Voice authenticity monitoring functions independently without GPS telemetry.
              </div>
            </div>
          )}

          {/* Privacy Disclaimer Guarantee */}
          <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
            <p className="font-semibold text-slate-300">Privacy Safeguards</p>
            <p className="text-[10px] leading-relaxed text-slate-400">
              • Microphone and location permissions are requested separately.
              <br />• Location is NEVER derived from acoustic signatures.
              <br />• Audio chunks are ephemeral in 4s RAM and immediately discarded.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Modality Breakdown Metric Bars */}
      <div className="bg-slate-950 px-6 py-4 border-t border-slate-800">
        <div className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-3">
          FUSION MODALITIES & AUDIO QUALITY
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-xs">
          {/* Spectral */}
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-[11px]">Spectral CNN</span>
              <span className="font-bold text-cyan-400">
                {result ? Math.round(result.spectral_score * 100) : 0}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-500 rounded-full transition-all duration-300"
                style={{ width: `${result ? result.spectral_score * 100 : 0}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-500 block">Centroid & Rolloff</span>
          </div>

          {/* Prosodic */}
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-[11px]">Prosodic TCN</span>
              <span className="font-bold text-indigo-400">
                {result ? Math.round(result.prosodic_score * 100) : 0}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                style={{ width: `${result ? result.prosodic_score * 100 : 0}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-500 block">Pitch Jitter & Cadence</span>
          </div>

          {/* Channel */}
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-[11px]">Channel Model</span>
              <span className="font-bold text-amber-400">
                {result ? Math.round(result.channel_score * 100) : 0}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-300"
                style={{ width: `${result ? result.channel_score * 100 : 0}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-500 block">Noise Floor & SNR</span>
          </div>

          {/* Audio Quality */}
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-[11px]">Audio Quality</span>
              <span className="font-bold text-emerald-400">
                {result ? Math.round(result.audio_quality) : 0}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${result ? result.audio_quality : 0}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-500 block">Conditioning Gate</span>
          </div>
        </div>
      </div>

      {/* 4. Recent Events Box */}
      <div className="bg-slate-900/60 px-6 py-4 border-t border-slate-800 font-mono text-xs">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
          Recent Events
        </div>
        <div className="space-y-1.5">
          {recentEvents.length > 0 ? (
            recentEvents.map((evt, i) => (
              <div
                key={i}
                className="flex items-center space-x-2 text-slate-300 text-[11px] bg-slate-950/60 border border-slate-800/80 px-3 py-1.5 rounded-lg"
              >
                <Activity className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>{evt}</span>
              </div>
            ))
          ) : (
            <div className="text-slate-500 text-[11px] italic">
              No recent events logged yet. Start monitoring to stream live events.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
