import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { Activity, ShieldCheck, ShieldAlert, AlertTriangle, Clock } from 'lucide-react';
import { TimelineEntry } from '../types/cmtsf';

interface RealTimeTimelineChartProps {
  timeline: TimelineEntry[];
}

export const RealTimeTimelineChart: React.FC<RealTimeTimelineChartProps> = ({
  timeline,
}) => {
  // Format data for Recharts
  const chartData = timeline.map((item, idx) => ({
    time: item.time,
    index: idx + 1,
    aiProbability: Math.round(item.ai_probability * 100),
    confidence: Math.round(item.confidence),
    verdict: item.verdict,
    risk: item.risk_level,
  }));

  return (
    <div
      id="real-time-timeline-card"
      className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl backdrop-blur-sm space-y-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-indigo-950/80 border border-indigo-800/60 text-indigo-400">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
              AI PROBABILITY & CONFIDENCE TIMELINE
            </h3>
            <span className="text-[11px] text-slate-400">
              Real-time rolling sliding analysis windows (last 30 seconds)
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs font-mono">
          <div className="flex items-center space-x-1.5 text-rose-400">
            <span className="w-2.5 h-0.5 bg-rose-500 inline-block rounded" />
            <span>AI Probability</span>
          </div>
          <div className="flex items-center space-x-1.5 text-cyan-400">
            <span className="w-2.5 h-0.5 bg-cyan-400 inline-block rounded" />
            <span>Confidence</span>
          </div>
        </div>
      </div>

      {/* Live Line Chart */}
      <div className="h-56 w-full bg-slate-950/60 rounded-lg p-3 border border-slate-800/80">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="time"
                stroke="#64748b"
                tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'monospace' }}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[0, 100]}
                stroke="#64748b"
                tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'monospace' }}
                unit="%"
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900 border border-slate-700 p-2.5 rounded-lg shadow-xl text-xs font-mono space-y-1">
                        <div className="text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>Time: {data.time}</span>
                        </div>
                        <div className="font-semibold text-slate-200">
                          {data.verdict}
                        </div>
                        <div className="text-rose-400">
                          AI Probability: {data.aiProbability}%
                        </div>
                        <div className="text-cyan-400">
                          Confidence: {data.confidence}%
                        </div>
                        <div className="text-[10px] uppercase text-slate-400">
                          Risk: {data.risk}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line
                type="monotone"
                dataKey="aiProbability"
                name="AI Probability"
                stroke="#f43f5e"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#f43f5e' }}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="confidence"
                name="Confidence"
                stroke="#06b6d4"
                strokeWidth={2}
                strokeDasharray="4 2"
                dot={false}
                activeDot={{ r: 4, fill: '#06b6d4' }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-xs font-mono text-slate-500">
            Awaiting streaming audio chunks to populate live chart...
          </div>
        )}
      </div>

      {/* Scrolling Timeline Table (Last 30 Analysis Windows) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400 font-mono px-1">
          <span>Analysis Window Log</span>
          <span>{timeline.length} / 30 windows buffered</span>
        </div>

        <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/70">
          <div className="max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 font-mono text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-900/90 text-slate-400 text-[10px] uppercase tracking-wider sticky top-0 border-b border-slate-800">
                <tr>
                  <th className="py-2 px-3 font-semibold">Time</th>
                  <th className="py-2 px-3 font-semibold">Verdict</th>
                  <th className="py-2 px-3 font-semibold text-right">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {timeline.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-slate-500 text-xs">
                      No windows analyzed yet. Start live monitoring to view sliding 1-second results.
                    </td>
                  </tr>
                ) : (
                  [...timeline].reverse().map((entry) => {
                    const isAi = entry.verdict === 'Likely AI-Generated Voice';
                    const isHuman = entry.verdict === 'Likely Human Voice';

                    return (
                      <tr key={entry.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="py-2 px-3 text-slate-400 text-[11px] whitespace-nowrap">
                          {entry.time}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            {isAi && <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                            {isHuman && <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                            {!isAi && !isHuman && (
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            )}
                            <span
                              className={`font-medium ${
                                isAi
                                  ? 'text-rose-300'
                                  : isHuman
                                  ? 'text-emerald-300'
                                  : 'text-amber-300'
                              }`}
                            >
                              {entry.verdict}
                            </span>
                            <span
                              className={`text-[9px] uppercase px-1.5 py-0.2 rounded border ${
                                entry.risk_level === 'Low'
                                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800/60'
                                  : entry.risk_level === 'Suspicious'
                                  ? 'bg-amber-950 text-amber-300 border-amber-800/60'
                                  : entry.risk_level === 'High'
                                  ? 'bg-rose-950 text-rose-300 border-rose-800/60'
                                  : 'bg-red-950 text-red-300 border-red-700 animate-pulse'
                              }`}
                            >
                              {entry.risk_level}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right font-semibold text-slate-200 whitespace-nowrap">
                          {Math.round(entry.confidence)}%
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
