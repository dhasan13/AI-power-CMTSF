import React from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  FileDown,
  RotateCcw,
  Sparkles,
  Info,
  Scale,
} from 'lucide-react';
import { Mp3AnalysisResponse, downloadJsonReport, downloadPdfReport } from '../utils/reportExport';

interface ResultCardProps {
  result: Mp3AnalysisResponse;
  onAnalyzeAnother: () => void;
  onDownloadReport: () => void;
}

export const ResultCard: React.FC<ResultCardProps> = ({
  result,
  onAnalyzeAnother,
}) => {
  const isAi = result.verdict === 'Likely AI-Generated Voice';
  const isSus = result.verdict === 'Suspicious / Inconclusive';
  const isHuman = result.verdict === 'Likely Human Voice';

  const getRiskBadge = (risk: string) => {
    switch (risk.toLowerCase()) {
      case 'critical':
        return 'bg-rose-950/80 text-rose-300 border-rose-800';
      case 'high':
        return 'bg-amber-950/80 text-amber-300 border-amber-800';
      case 'medium':
        return 'bg-yellow-950/80 text-yellow-300 border-yellow-800';
      default:
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-800';
    }
  };

  return (
    <div id="result-card" className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-xl backdrop-blur-sm space-y-6">
      {/* Demo Mode Notice Banner or Trained Model Indicator */}
      {result.is_demo_mode ? (
        <div
          id="demo-mode-banner"
          className="p-3.5 rounded-lg bg-amber-950/40 border border-amber-500/50 text-amber-200 text-xs flex items-start gap-2.5"
        >
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block text-amber-300">
              Demo Mode — Replace with trained CMTSF-Net models for real evaluation.
            </span>
            <span className="text-amber-300/80 text-[11px] leading-relaxed">
              Predictions are generated using deterministic feature extraction and prototype rule baselines.
              Do not present fabricated probabilities as scientifically validated clinical/legal results.
            </span>
          </div>
        </div>
      ) : (
        <div
          id="trained-model-banner"
          className="p-3.5 rounded-lg bg-emerald-950/30 border border-emerald-500/40 text-emerald-200 text-xs flex items-center justify-between gap-2.5"
        >
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <span className="font-semibold text-emerald-300">
                Trained Dataset Model Active (CMTSF-Net Binary Classifier v1.0)
              </span>
              <span className="text-emerald-300/75 text-[11px] block">
                Trained on acoustic dataset with strict speaker separation; calibrated against 65% inconclusive threshold.
              </span>
            </div>
          </div>
          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300 border border-emerald-700/60 shrink-0">
            Validated ML Model
          </span>
        </div>
      )}

      {/* Primary Verdict Header */}
      <div
        className={`p-6 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
          isAi
            ? 'bg-rose-950/25 border-rose-800/80 text-rose-100 shadow-lg shadow-rose-950/20'
            : isSus
            ? 'bg-amber-950/25 border-amber-800/80 text-amber-100 shadow-lg shadow-amber-950/20'
            : 'bg-emerald-950/25 border-emerald-800/80 text-emerald-100 shadow-lg shadow-emerald-950/20'
        }`}
      >
        <div className="flex items-start gap-4">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border ${
              isAi
                ? 'bg-rose-500/20 border-rose-500/30 text-rose-400'
                : isSus
                ? 'bg-amber-500/20 border-amber-500/30 text-amber-400'
                : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
            }`}
          >
            {isAi ? (
              <ShieldAlert className="w-8 h-8" />
            ) : isSus ? (
              <AlertTriangle className="w-8 h-8" />
            ) : (
              <ShieldCheck className="w-8 h-8" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xs uppercase tracking-wider font-mono text-slate-400">
                Final CMTSF-Net Verdict
              </span>
              <span
                className={`text-[11px] font-mono px-2 py-0.5 rounded-full border uppercase font-semibold ${getRiskBadge(
                  result.risk_level
                )}`}
              >
                {result.risk_level} Risk
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">
              {result.verdict}
            </h1>

            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Analyzed <span className="font-mono text-cyan-300">{result.filename}</span> ({result.duration_sec.toFixed(1)}s • 16 kHz Mono). Result derived via Gated Attention Fusion of spectral, prosodic, and channel modalities.
            </p>
          </div>
        </div>

        {/* Confidence Gauge */}
        <div className="flex md:flex-col items-center md:items-end justify-between border-t md:border-t-0 border-slate-800 pt-3 md:pt-0">
          <div className="text-left md:text-right">
            <span className="text-xs text-slate-400 block">Confidence Score</span>
            <div className="text-3xl font-bold text-slate-100 font-mono flex items-baseline md:justify-end gap-1">
              <span>{result.confidence.toFixed(1)}%</span>
            </div>
          </div>
          <span className="text-[10px] text-slate-400 max-w-[120px] md:text-right mt-1">
            AI-Assisted Prediction
          </span>
        </div>
      </div>

      {/* Probabilities Metric Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* AI Probability */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <span className="text-xs text-slate-400 block mb-1">AI Voice Probability</span>
          <div className="text-2xl font-bold font-mono text-rose-400">
            {result.ai_probability.toFixed(1)}%
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
            <div
              className="bg-rose-500 h-full rounded-full"
              style={{ width: `${result.ai_probability}%` }}
            />
          </div>
        </div>

        {/* Human Probability */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <span className="text-xs text-slate-400 block mb-1">Human Probability</span>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {result.human_probability.toFixed(1)}%
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
            <div
              className="bg-emerald-500 h-full rounded-full"
              style={{ width: `${result.human_probability}%` }}
            />
          </div>
        </div>

        {/* Gated Fusion Confidence */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <span className="text-xs text-slate-400 block mb-1">Spectral AI Score</span>
          <div className="text-2xl font-bold font-mono text-cyan-400">
            {result.spectral_score.toFixed(1)}%
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">
            Weight: {(result.gated_weights.spectral * 100).toFixed(0)}%
          </span>
        </div>

        {/* Audio Quality Score */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <span className="text-xs text-slate-400 block mb-1">Audio Quality Condition</span>
          <div className="text-2xl font-bold font-mono text-indigo-400">
            {result.audio_quality.toFixed(1)}%
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">
            Conditioning Gate Active
          </span>
        </div>
      </div>

      {/* Explainable AI (XAI) Section */}
      <div className="p-5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-3">
        <div className="flex items-center gap-2 text-slate-200">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold">
            Explainable AI (XAI) — Reasoning & Decision Drivers
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {result.explanation.map((exp, idx) => (
            <div
              key={idx}
              className="p-3 rounded-lg bg-slate-900/70 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5"
            >
              <div className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-400 flex items-center justify-center shrink-0 text-[10px] font-mono mt-0.5">
                {idx + 1}
              </div>
              <span className="leading-relaxed">{exp}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Mandatory Scientific Disclaimer */}
      <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/60 text-slate-400 text-xs space-y-1">
        <div className="flex items-center gap-1.5 font-medium text-slate-300">
          <Scale className="w-3.5 h-3.5 text-slate-400" />
          <span>Scientific & Legal Disclaimer</span>
        </div>
        <p className="text-[11px] leading-relaxed text-slate-400">
          {result.disclaimer} CMTSF-Net evaluates statistical acoustic artifacts, neural vocoder dispersion, and prosodic cadence metrics. It is an auxiliary decision-support tool and must not be used as the sole basis for legal, disciplinary, or financial actions without multi-factor verification.
        </p>
      </div>

      {/* Bottom Actions: Download PDF / JSON & Analyze Another */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            id="btn-download-pdf-report"
            onClick={() => downloadPdfReport(result)}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition hover:text-white"
          >
            <FileDown className="w-4 h-4 text-cyan-400" />
            <span>Download PDF Report</span>
          </button>

          <button
            id="btn-download-json-report"
            onClick={() => downloadJsonReport(result)}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition"
          >
            <span>JSON</span>
          </button>
        </div>

        <button
          id="btn-analyze-another-audio"
          onClick={onAnalyzeAnother}
          className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition shadow-md shadow-cyan-600/20"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Analyze Another Audio</span>
        </button>
      </div>
    </div>
  );
};
