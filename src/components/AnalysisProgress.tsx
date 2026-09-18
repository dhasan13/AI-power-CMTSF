import React from 'react';
import {
  Upload,
  Cpu,
  Layers,
  Activity,
  Radio,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

interface AnalysisProgressProps {
  currentStepIndex: number;
  steps: Array<{ label: string; detail: string }>;
}

export const AnalysisProgress: React.FC<AnalysisProgressProps> = ({
  currentStepIndex,
  steps,
}) => {
  const percent = Math.min(100, Math.round(((currentStepIndex + 1) / steps.length) * 100));

  const getStepIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Upload className="w-4 h-4" />;
      case 1:
        return <Cpu className="w-4 h-4" />;
      case 2:
        return <Layers className="w-4 h-4" />;
      case 3:
        return <Activity className="w-4 h-4" />;
      case 4:
        return <Radio className="w-4 h-4" />;
      case 5:
        return <Sparkles className="w-4 h-4" />;
      default:
        return <CheckCircle2 className="w-4 h-4" />;
    }
  };

  return (
    <div id="analysis-progress-card" className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-xl backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <h3 className="text-sm font-semibold text-slate-200">
            CMTSF-Net Multimodal Audio Processing Pipeline
          </h3>
        </div>
        <span className="text-xs font-mono font-medium text-cyan-400 bg-cyan-950/60 px-2.5 py-1 rounded-full border border-cyan-800/60">
          {percent}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mb-6">
        <div
          className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 transition-all duration-300 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Steps Pipeline Tracker */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {steps.map((step, idx) => {
          const isDone = idx < currentStepIndex;
          const isCurrent = idx === currentStepIndex;

          return (
            <div
              key={idx}
              className={`p-3 rounded-lg border transition-all text-left flex flex-col justify-between ${
                isCurrent
                  ? 'bg-cyan-950/40 border-cyan-500/80 shadow-md shadow-cyan-500/10'
                  : isDone
                  ? 'bg-slate-900/60 border-emerald-500/40 text-slate-300'
                  : 'bg-slate-950/40 border-slate-800/80 text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div
                  className={`w-7 h-7 rounded-md flex items-center justify-center ${
                    isCurrent
                      ? 'bg-cyan-500/20 text-cyan-300'
                      : isDone
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {isDone ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : getStepIcon(idx)}
                </div>
                <span className="text-[10px] font-mono text-slate-400">0{idx + 1}</span>
              </div>
              <div>
                <p
                  className={`text-xs font-semibold leading-tight ${
                    isCurrent ? 'text-cyan-300' : isDone ? 'text-slate-200' : 'text-slate-400'
                  }`}
                >
                  {step.label}
                </p>
                <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{step.detail}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
