import React from 'react';
import { Layers, Activity, Radio, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Mp3AnalysisResponse } from '../utils/reportExport';

interface FeatureCardsProps {
  result: Mp3AnalysisResponse;
}

export const FeatureCards: React.FC<FeatureCardsProps> = ({ result }) => {
  return (
    <div id="feature-cards-section" className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-100">
            Tri-Modality Feature Analysis
          </h3>
          <p className="text-xs text-slate-400">
            CMTSF-Net decomposes input audio across orthogonal acoustic, behavioral, and transmission dimensions.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Modality A: Spectral Analysis */}
        <div
          id="card-modality-a-spectral"
          className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-200">Modality A: Spectral</h4>
                  <span className="text-[10px] font-mono text-cyan-400">CNN Frequency Analysis</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-mono font-bold text-cyan-300">
                  {result.spectral_score.toFixed(1)}%
                </span>
                <span className="text-[10px] text-slate-400 block">AI Subscore</span>
              </div>
            </div>

            {/* Metrics List */}
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Spectral Centroid:</span>
                <span className="font-mono text-slate-200 font-medium">
                  {result.spectral_findings.spectral_centroid_hz} Hz
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Spectral Rolloff (85%):</span>
                <span className="font-mono text-slate-200 font-medium">
                  {result.spectral_findings.spectral_rolloff_hz} Hz
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Spectral Flatness (Wiener):</span>
                <span className="font-mono text-slate-200 font-medium">
                  {result.spectral_findings.spectral_flatness.toFixed(4)}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                <span className="text-slate-400">High-Freq Energy Ratio (&gt;4kHz):</span>
                <span className="font-mono text-slate-200 font-medium">
                  {(result.spectral_findings.high_freq_energy_ratio * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800">
            <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1">
              Spectral Verdict Summary
            </span>
            <p className="text-xs text-slate-300">
              {result.spectral_findings.anomalies[0] || 'Nominal frequency distribution observed.'}
            </p>
          </div>
        </div>

        {/* Modality B: Prosodic Analysis */}
        <div
          id="card-modality-b-prosodic"
          className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-200">Modality B: Prosodic</h4>
                  <span className="text-[10px] font-mono text-amber-400">TCN Temporal Cadence</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-mono font-bold text-amber-300">
                  {result.prosodic_score.toFixed(1)}%
                </span>
                <span className="text-[10px] text-slate-400 block">AI Subscore</span>
              </div>
            </div>

            {/* Metrics List */}
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Mean F0 Fundamental:</span>
                <span className="font-mono text-slate-200 font-medium">
                  {result.prosodic_findings.f0_mean_hz.toFixed(1)} Hz
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                <span className="text-slate-400">F0 Pitch Variation (Std Dev):</span>
                <span className="font-mono text-slate-200 font-medium">
                  {result.prosodic_findings.f0_std_dev.toFixed(1)} Hz
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Estimated Speaking Rate:</span>
                <span className="font-mono text-slate-200 font-medium">
                  ~{result.prosodic_findings.speaking_rate_wpm} WPM
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Rhythmic Cadence Regularity:</span>
                <span className="font-mono text-slate-200 font-medium">
                  {(result.prosodic_findings.rhythm_regularity * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800">
            <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1">
              Behavioral Cadence Summary
            </span>
            <p className="text-xs text-slate-300">
              {result.prosodic_findings.behavioral_notes[0] || 'Natural dynamic vocal variation.'}
            </p>
          </div>
        </div>

        {/* Modality C: Channel Analysis */}
        <div
          id="card-modality-c-channel"
          className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Radio className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-200">Modality C: Channel</h4>
                  <span className="text-[10px] font-mono text-emerald-400">Acoustic Room & SNR</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-mono font-bold text-emerald-300">
                  {result.channel_score.toFixed(1)}%
                </span>
                <span className="text-[10px] text-slate-400 block">Channel Risk</span>
              </div>
            </div>

            {/* Metrics List */}
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Signal-to-Noise Ratio (SNR):</span>
                <span className="font-mono text-slate-200 font-medium">
                  {result.channel_findings.snr_db.toFixed(1)} dB
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Background Noise Floor:</span>
                <span className="font-mono text-slate-200 font-medium">
                  {result.channel_findings.noise_floor_dbfs.toFixed(1)} dBFS
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Estimated Reverb (RT60):</span>
                <span className="font-mono text-slate-200 font-medium">
                  {result.channel_findings.reverb_rt60_sec.toFixed(2)}s
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Compression Artifact Index:</span>
                <span className="font-mono text-slate-200 font-medium">
                  {result.channel_findings.compression_artifact_index.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800">
            <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1">
              Environmental Note
            </span>
            <p className="text-xs text-slate-300">
              {result.channel_findings.channel_diagnosis}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
