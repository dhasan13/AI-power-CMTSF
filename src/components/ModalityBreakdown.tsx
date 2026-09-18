import React from 'react';
import {
  Zap,
  Layers,
  Cpu,
  Waves,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  ShieldAlert,
} from 'lucide-react';
import { CMTSFDetectionResult } from '../types/cmtsf';

interface ModalityBreakdownProps {
  result: CMTSFDetectionResult;
}

export const ModalityBreakdown: React.FC<ModalityBreakdownProps> = ({ result }) => {
  const { spectralModality, prosodicModality, channelModality, fusion } = result;

  const specPercent = Math.round(fusion.spectralWeight * 100);
  const prosPercent = Math.round(fusion.prosodicWeight * 100);
  const chanPercent = Math.round(fusion.channelWeight * 100);

  return (
    <div id="modality-breakdown-section" className="space-y-6">
      {/* 1. Gated Attention Fusion Mechanism Card */}
      <div className="rounded-xl border border-indigo-500/30 bg-gradient-to-b from-indigo-950/40 via-slate-900/90 to-slate-950 p-5 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-indigo-500/20">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <Sliders className="w-4 h-4" />
              </span>
              <h3 className="text-base font-bold text-white tracking-tight">
                Gated Attention Fusion Network
              </h3>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono uppercase bg-indigo-900/60 text-indigo-300 border border-indigo-700/50">
                Dynamic Learnable Gating
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              CMTSF-Net dynamically assigns adaptive attention weights to each modality based on input signal quality, room reverberation, and channel noise floor.
            </p>
          </div>

          <div className="flex items-center space-x-3 bg-slate-950/80 px-3.5 py-2 rounded-lg border border-slate-800 text-xs font-mono">
            <div>
              <span className="text-slate-500">Audio Quality:</span>{' '}
              <span className={`font-bold ${fusion.audioQualityScore > 0.6 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {fusion.audioQualityScore > 0.6 ? 'HIGH (Studio/Clean)' : 'DEGRADED (Noisy/VoIP)'}
              </span>
            </div>
            <span className="text-slate-700">|</span>
            <div>
              <span className="text-slate-500">Fusion Latency:</span>{' '}
              <span className="text-cyan-400 font-semibold">{fusion.inferenceLatencyMs} ms</span>
            </div>
          </div>
        </div>

        {/* Dynamic Attention Weight Distribution Bar */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-300">
            <span>Dynamic Fusion Weights (α_spectral, α_prosodic, α_channel)</span>
            <span className="font-mono text-[11px] text-indigo-300">
              Softmax Attention Gating
            </span>
          </div>

          <div className="h-4 w-full bg-slate-950 rounded-full overflow-hidden flex border border-slate-800 p-0.5">
            <div
              style={{ width: `${specPercent}%` }}
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-l-full transition-all duration-700 flex items-center justify-center text-[9px] font-mono text-white font-bold"
              title={`Spectral Weight: ${specPercent}%`}
            >
              {specPercent > 12 && `${specPercent}%`}
            </div>
            <div
              style={{ width: `${prosPercent}%` }}
              className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-700 flex items-center justify-center text-[9px] font-mono text-white font-bold"
              title={`Prosodic Weight: ${prosPercent}%`}
            >
              {prosPercent > 12 && `${prosPercent}%`}
            </div>
            <div
              style={{ width: `${chanPercent}%` }}
              className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-r-full transition-all duration-700 flex items-center justify-center text-[9px] font-mono text-white font-bold"
              title={`Channel Weight: ${chanPercent}%`}
            >
              {chanPercent > 12 && `${chanPercent}%`}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center pt-1 text-xs">
            <div className="flex items-center justify-center space-x-1.5 text-cyan-400 font-mono">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              <span>Spectral: {specPercent}%</span>
            </div>
            <div className="flex items-center justify-center space-x-1.5 text-violet-400 font-mono">
              <span className="w-2 h-2 rounded-full bg-violet-400"></span>
              <span>Prosodic: {prosPercent}%</span>
            </div>
            <div className="flex items-center justify-center space-x-1.5 text-amber-400 font-mono">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span>Channel: {chanPercent}%</span>
            </div>
          </div>
        </div>

        {/* Dynamic Gating Reasoning Box */}
        <div className="mt-4 p-3 rounded-lg bg-indigo-950/30 border border-indigo-900/50 text-xs text-indigo-200/90 leading-relaxed font-sans">
          <span className="font-semibold text-indigo-300">Fusion Gating Rule: </span>
          {fusion.audioQualityScore > 0.6 ? (
            <span>
              Clean high-SNR channel detected. Gating network balances high-resolution <strong>Spectral Micro-Analysis ({specPercent}%)</strong> to hunt vocoder phase inconsistencies and <strong>Prosodic TCN ({prosPercent}%)</strong> to check cadence authenticity.
            </span>
          ) : (
            <span>
              Low SNR or compressed audio channel detected. To prevent false positives caused by acoustic noise artifacts, gating network automatically shifts dominant weight to <strong>Prosodic-Behavioral TCN ({prosPercent}%)</strong>, which is invariant to environmental degradation.
            </span>
          )}
        </div>
      </div>

      {/* 2. Three Modality Cards in Responsive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* MODALITY A: Spectral-Phase Analysis */}
        <div
          id="modality-spectral-card"
          className="rounded-xl border border-cyan-900/50 bg-slate-900/80 p-5 shadow-lg flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <Waves className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="text-sm font-bold text-white">Modality A: Spectral-Phase</h4>
                  <span className="text-[10px] font-mono text-cyan-400">CNN / Lightweight ViT</span>
                </div>
              </div>
              <div className="text-right font-mono">
                <div className="text-xs text-slate-400">Fake Prob</div>
                <div
                  className={`text-sm font-bold ${
                    spectralModality.spectralFakeProbability > 0.5 ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  {Math.round(spectralModality.spectralFakeProbability * 100)}%
                </div>
              </div>
            </div>

            {/* Metrics List */}
            <div className="mt-4 space-y-2 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Spectral Centroid:</span>
                <span className="text-slate-200 font-semibold">{spectralModality.spectralCentroidHz} Hz</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Spectral Rolloff (85%):</span>
                <span className="text-slate-200 font-semibold">{spectralModality.spectralRolloffHz} Hz</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Spectral Flatness:</span>
                <span className="text-slate-200 font-semibold">{spectralModality.spectralFlatness}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Phase Inconsistency:</span>
                <span
                  className={`font-semibold ${
                    spectralModality.phaseInconsistencyScore > 0.45 ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  {spectralModality.phaseInconsistencyScore}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Deconv Artifact Index:</span>
                <span
                  className={`font-semibold ${
                    spectralModality.highFreqArtifactScore > 0.45 ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  {spectralModality.highFreqArtifactScore}
                </span>
              </div>
            </div>

            {/* CQT Energy Distribution bar preview */}
            <div className="mt-4 pt-3 border-t border-slate-800">
              <div className="text-[11px] font-mono text-slate-400 mb-1.5 flex justify-between">
                <span>CQT Sub-band Filterbank Energy</span>
                <span className="text-cyan-400">12 Bins</span>
              </div>
              <div className="flex items-end space-x-1 h-10 bg-slate-950 p-1.5 rounded border border-slate-800">
                {spectralModality.cqtEnergyBands.map((band, idx) => (
                  <div
                    key={idx}
                    style={{ height: `${Math.max(15, band * 100)}%` }}
                    className="flex-1 bg-cyan-500/70 hover:bg-cyan-400 rounded-t-sm transition-all"
                    title={`Bin ${idx + 1}: ${(band * 100).toFixed(1)}%`}
                  />
                ))}
              </div>
            </div>

            {/* Detected Spectral Anomalies */}
            <div className="mt-4 space-y-1.5">
              <div className="text-[11px] font-mono text-slate-400 font-semibold uppercase">
                Acoustic Signatures
              </div>
              {spectralModality.detectedAnomalies.map((anom, i) => (
                <div
                  key={i}
                  className="flex items-start space-x-2 text-[11px] p-1.5 rounded bg-slate-950/60 border border-slate-800/80 text-slate-300"
                >
                  {spectralModality.spectralFakeProbability > 0.5 ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  )}
                  <span>{anom}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CNN Embedding Vector sample */}
          <div className="mt-4 pt-3 border-t border-slate-800 text-[10px] font-mono text-slate-500">
            <div>CNN Embedding Vector z_spec ∈ ℝ¹²⁸:</div>
            <div className="truncate text-slate-400 mt-0.5">
              [{spectralModality.featureVectorSample.join(', ')}...]
            </div>
          </div>
        </div>

        {/* MODALITY B: Prosodic-Behavioral Analysis */}
        <div
          id="modality-prosodic-card"
          className="rounded-xl border border-violet-900/50 bg-slate-900/80 p-5 shadow-lg flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <span className="p-1.5 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20">
                  <Activity className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="text-sm font-bold text-white">Modality B: Prosodic-Behavior</h4>
                  <span className="text-[10px] font-mono text-violet-400">Temporal ConvNet (TCN)</span>
                </div>
              </div>
              <div className="text-right font-mono">
                <div className="text-xs text-slate-400">Fake Prob</div>
                <div
                  className={`text-sm font-bold ${
                    prosodicModality.prosodicFakeProbability > 0.5 ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  {Math.round(prosodicModality.prosodicFakeProbability * 100)}%
                </div>
              </div>
            </div>

            {/* Metrics List */}
            <div className="mt-4 space-y-2 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Mean Pitch F0:</span>
                <span className="text-slate-200 font-semibold">{prosodicModality.fundamentalF0MeanHz} Hz</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">F0 Pitch Variation (StdDev):</span>
                <span
                  className={`font-semibold ${
                    prosodicModality.f0StdDeviation < 7 ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  ±{prosodicModality.f0StdDeviation} Hz {prosodicModality.f0StdDeviation < 7 ? '(Monotonic)' : '(Dynamic)'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Speaking Rate:</span>
                <span className="text-slate-200 font-semibold">{prosodicModality.speakingRateWpm} WPM</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Micro-Hesitation Ratio:</span>
                <span
                  className={`font-semibold ${
                    prosodicModality.hesitationRatio < 0.06 ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  {(prosodicModality.hesitationRatio * 100).toFixed(1)}% {prosodicModality.hesitationRatio < 0.06 && '(Hyper-fluent)'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Robotic Rhythm Index:</span>
                <span
                  className={`font-semibold ${
                    prosodicModality.roboticRhythmIndex > 0.6 ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  {prosodicModality.roboticRhythmIndex}
                </span>
              </div>
            </div>

            {/* Pitch Track Contour Visualizer */}
            <div className="mt-4 pt-3 border-t border-slate-800">
              <div className="text-[11px] font-mono text-slate-400 mb-1.5 flex justify-between">
                <span>F0 Intonation Track Contour</span>
                <span className="text-violet-400">TCN Receptive Field</span>
              </div>
              <div className="h-10 bg-slate-950 p-1 rounded border border-slate-800 flex items-center justify-between">
                {prosodicModality.f0Contour.map((val, idx) => {
                  const min = 80;
                  const max = 260;
                  const heightPercent = Math.max(10, Math.min(90, ((val - min) / (max - min)) * 100));
                  return (
                    <div
                      key={idx}
                      style={{ height: `${heightPercent}%` }}
                      className="w-1.5 bg-violet-400/80 rounded-full"
                      title={`${val.toFixed(0)} Hz`}
                    />
                  );
                })}
              </div>
            </div>

            {/* Behavioral Findings */}
            <div className="mt-4 space-y-1.5">
              <div className="text-[11px] font-mono text-slate-400 font-semibold uppercase">
                Temporal Findings
              </div>
              {prosodicModality.behavioralFindings.map((finding, i) => (
                <div
                  key={i}
                  className="flex items-start space-x-2 text-[11px] p-1.5 rounded bg-slate-950/60 border border-slate-800/80 text-slate-300"
                >
                  {prosodicModality.prosodicFakeProbability > 0.5 ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  )}
                  <span>{finding}</span>
                </div>
              ))}
            </div>
          </div>

          {/* TCN Embedding Vector */}
          <div className="mt-4 pt-3 border-t border-slate-800 text-[10px] font-mono text-slate-500">
            <div>TCN Embedding Vector z_pros ∈ ℝ¹²⁸:</div>
            <div className="truncate text-slate-400 mt-0.5">
              [{prosodicModality.featureVectorSample.join(', ')}...]
            </div>
          </div>
        </div>

        {/* MODALITY C: Channel & Environmental Analysis */}
        <div
          id="modality-channel-card"
          className="rounded-xl border border-amber-900/50 bg-slate-900/80 p-5 shadow-lg flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Cpu className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="text-sm font-bold text-white">Modality C: Channel Context</h4>
                  <span className="text-[10px] font-mono text-amber-400">Acoustic & Network Quality</span>
                </div>
              </div>
              <div className="text-right font-mono">
                <div className="text-xs text-slate-400">Env Risk</div>
                <div className="text-sm font-bold text-amber-400">
                  {Math.round(channelModality.environmentalRiskScore * 100)}%
                </div>
              </div>
            </div>

            {/* Metrics List */}
            <div className="mt-4 space-y-2 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Signal-to-Noise (SNR):</span>
                <span className="text-slate-200 font-semibold">{channelModality.snrDb} dB</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Noise Floor:</span>
                <span className="text-slate-200 font-semibold">{channelModality.backgroundNoiseFloorDb} dBFS</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Room Reverb (RT60):</span>
                <span className="text-slate-200 font-semibold">{channelModality.rt60ReverberationSec} s</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">VoIP / GSM Codec Index:</span>
                <span className="text-slate-200 font-semibold">{channelModality.codecArtifactIndex}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Jitter / Packet Loss:</span>
                <span className="text-slate-200 font-semibold">
                  {channelModality.jitterMs}ms / {channelModality.packetLossEstimatedPercent}%
                </span>
              </div>
            </div>

            {/* Channel Quality Status Bar */}
            <div className="mt-4 pt-3 border-t border-slate-800">
              <div className="text-[11px] font-mono text-slate-400 mb-1.5 flex justify-between">
                <span>Channel Integrity Level</span>
                <span className="text-amber-400">{channelModality.snrDb > 25 ? 'Clean Studio' : 'Degraded Channel'}</span>
              </div>
              <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800">
                <div
                  style={{ width: `${Math.min(100, Math.max(10, (channelModality.snrDb / 35) * 100))}%` }}
                  className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full"
                />
              </div>
            </div>

            {/* Channel Diagnosis Note */}
            <div className="mt-4 p-2.5 rounded bg-slate-950/70 border border-slate-800 text-xs text-slate-300 leading-relaxed">
              <div className="text-[11px] font-mono text-amber-400 font-semibold mb-1 flex items-center space-x-1">
                <Zap className="w-3 h-3" />
                <span>Supporting Evidence Context</span>
              </div>
              <p>{channelModality.channelDiagnosis}</p>
              <p className="mt-1 text-[11px] text-slate-400 italic">
                *Treated as context to modulate fusion weights, not standalone proof of forgery.
              </p>
            </div>
          </div>

          {/* Channel Embedding Vector */}
          <div className="mt-4 pt-3 border-t border-slate-800 text-[10px] font-mono text-slate-500">
            <div>Channel Vector z_chan ∈ ℝ⁶⁴:</div>
            <div className="truncate text-slate-400 mt-0.5">
              [{channelModality.featureVectorSample.join(', ')}...]
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
