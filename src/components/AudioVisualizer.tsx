import React, { useEffect, useRef, useState } from 'react';
import { Play, Square, Eye, Activity, BarChart2, Radio } from 'lucide-react';
import { playAudioBuffer, stopActiveAudio } from '../utils/presetAudioSamples';
import { CMTSFDetectionResult } from '../types/cmtsf';

interface AudioVisualizerProps {
  result: CMTSFDetectionResult | null;
  rawPcm: Float32Array | null;
  sampleRate?: number;
  isRecording?: boolean;
  audioBuffer?: AudioBuffer | null;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  result,
  rawPcm,
  sampleRate = 16000,
  isRecording = false,
  audioBuffer = null,
}) => {
  const [activeTab, setActiveTab] = useState<'WAVEFORM' | 'SPECTROGRAM' | 'PHASE_VECTOR'>('WAVEFORM');
  const [isPlaying, setIsPlaying] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const playbackStartTimeRef = useRef<number>(0);

  const handlePlayToggle = () => {
    if (isPlaying) {
      stopActiveAudio();
      setIsPlaying(false);
    } else if (audioBuffer) {
      setIsPlaying(true);
      playbackStartTimeRef.current = performance.now();
      playAudioBuffer(audioBuffer, () => {
        setIsPlaying(false);
      });
    }
  };

  useEffect(() => {
    return () => {
      stopActiveAudio();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Canvas drawing effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = rect.width || 640;
    const height = rect.height || 220;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Background grid
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = 'rgba(30, 41, 59, 0.5)';
      ctx.lineWidth = 1;
      const gridStepsX = 8;
      const gridStepsY = 4;
      for (let i = 0; i <= gridStepsX; i++) {
        const x = (i * width) / gridStepsX;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let j = 0; j <= gridStepsY; j++) {
        const y = (j * height) / gridStepsY;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      if (activeTab === 'WAVEFORM') {
        drawWaveform(ctx, width, height);
      } else if (activeTab === 'SPECTROGRAM') {
        drawSpectrogram(ctx, width, height);
      } else {
        drawPhaseVector(ctx, width, height);
      }

      // If playing or recording, continuously request animation frame
      if (isPlaying || isRecording) {
        animationFrameRef.current = requestAnimationFrame(draw);
      }
    };

    const drawWaveform = (c: CanvasRenderingContext2D, w: number, h: number) => {
      const midY = h / 2;

      // Center baseline
      c.strokeStyle = 'rgba(51, 65, 85, 0.6)';
      c.beginPath();
      c.moveTo(0, midY);
      c.lineTo(w, midY);
      c.stroke();

      if (!rawPcm || rawPcm.length === 0) {
        // Empty state placeholder
        c.fillStyle = '#64748b';
        c.font = '13px monospace';
        c.textAlign = 'center';
        c.fillText('Waiting for audio capture or file selection...', w / 2, midY + 5);
        return;
      }

      const pcm = rawPcm;
      const step = Math.max(1, Math.floor(pcm.length / w));
      const isAi = result?.fusion.classification === 'AI_SYNTHETIC_CLONE';

      // Waveform path
      c.beginPath();
      c.strokeStyle = isAi ? '#f43f5e' : '#06b6d4';
      c.lineWidth = 1.5;

      for (let x = 0; x < w; x++) {
        const sampleIdx = Math.min(pcm.length - 1, x * step);
        let sample = pcm[sampleIdx] || 0;
        
        // Slight animated pulse if recording
        if (isRecording) {
          sample += (Math.random() - 0.5) * 0.08;
        }

        const y = midY - sample * (h * 0.42);
        if (x === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      c.stroke();

      // Mirror soft glow fill
      c.lineTo(w, midY);
      c.lineTo(0, midY);
      c.fillStyle = isAi ? 'rgba(244, 63, 94, 0.08)' : 'rgba(6, 182, 212, 0.08)';
      c.fill();

      // Playback scrubber cursor
      if (isPlaying && audioBuffer) {
        const elapsed = (performance.now() - playbackStartTimeRef.current) / 1000;
        const totalDuration = audioBuffer.duration || 1;
        const progress = Math.min(1.0, elapsed / totalDuration);
        const cursorX = progress * w;

        c.strokeStyle = '#38bdf8';
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(cursorX, 0);
        c.lineTo(cursorX, h);
        c.stroke();

        c.fillStyle = '#38bdf8';
        c.font = '10px monospace';
        c.textAlign = 'left';
        c.fillText(`${elapsed.toFixed(1)}s`, cursorX + 4, 14);
      }

      // Time axis labels
      c.fillStyle = '#64748b';
      c.font = '10px monospace';
      c.textAlign = 'left';
      c.fillText('0.0s', 6, h - 6);
      c.textAlign = 'right';
      const dur = result?.preprocessing.originalDurationSec || (pcm.length / sampleRate);
      c.fillText(`${dur.toFixed(1)}s (16 kHz)`, w - 6, h - 6);
    };

    const drawSpectrogram = (c: CanvasRenderingContext2D, w: number, h: number) => {
      const snapshot = result?.spectralModality.melSpectrogramSnapshot;
      if (!snapshot || snapshot.length === 0) {
        c.fillStyle = '#64748b';
        c.font = '13px monospace';
        c.textAlign = 'center';
        c.fillText('Run CMTSF-Net scan to generate Mel Spectrogram & CQT heatmap', w / 2, h / 2);
        return;
      }

      const bands = snapshot.length;
      const timeSteps = snapshot[0].length;
      const cellW = (w - 50) / timeSteps;
      const cellH = h / bands;

      for (let b = 0; b < bands; b++) {
        const y = h - (b + 1) * cellH; // Invert so 0Hz is at bottom
        for (let t = 0; t < timeSteps; t++) {
          const x = 45 + t * cellW;
          const energy = snapshot[b][t];

          // Cyberpunk spectrogram colormap: Deep blue -> Violet -> Orange -> Yellow
          const r = Math.min(255, Math.floor(energy * 280));
          const g = Math.min(255, Math.floor(energy * 180 * (energy > 0.4 ? 1.2 : 0.5)));
          const bVal = Math.min(255, Math.floor((1 - energy * 0.8) * 220));

          c.fillStyle = `rgb(${r}, ${g}, ${bVal})`;
          c.fillRect(x, y, cellW + 0.5, cellH + 0.5);
        }
      }

      // Highlight synthetic vocoder artifact zone if AI clone
      if (result?.spectralModality.highFreqArtifactScore && result.spectralModality.highFreqArtifactScore > 0.5) {
        c.strokeStyle = 'rgba(239, 68, 68, 0.8)';
        c.lineWidth = 1.5;
        c.setLineDash([4, 4]);
        const artifactY = h * 0.15;
        c.strokeRect(45, 0, w - 45, artifactY);
        c.setLineDash([]);
        
        c.fillStyle = '#f87171';
        c.font = '10px monospace';
        c.textAlign = 'right';
        c.fillText('⚠️ HiFi-GAN Vocoder Checkerboard Grid (>6.5 kHz)', w - 8, 14);
      }

      // Frequency labels on left axis
      c.fillStyle = '#94a3b8';
      c.font = '9px monospace';
      c.textAlign = 'right';
      c.fillText('8 kHz', 40, 12);
      c.fillText('4 kHz', 40, h * 0.5);
      c.fillText('1 kHz', 40, h * 0.8);
      c.fillText('0 Hz', 40, h - 4);
    };

    const drawPhaseVector = (c: CanvasRenderingContext2D, w: number, h: number) => {
      const phaseData = result?.spectralModality.phaseDeviationMap;
      const midY = h / 2;

      c.strokeStyle = '#334155';
      c.beginPath();
      c.moveTo(0, midY);
      c.lineTo(w, midY);
      c.stroke();

      if (!phaseData || phaseData.length === 0) {
        c.fillStyle = '#64748b';
        c.font = '13px monospace';
        c.textAlign = 'center';
        c.fillText('Phase Inconsistency & Group Delay Vector Map', w / 2, midY);
        return;
      }

      const numPoints = 64;
      const stepX = w / numPoints;
      const isAi = result.spectralModality.phaseInconsistencyScore > 0.45;

      c.beginPath();
      c.strokeStyle = isAi ? '#f59e0b' : '#10b981';
      c.lineWidth = 2;

      for (let i = 0; i < numPoints; i++) {
        const x = i * stepX;
        const harmonic = (i % 8) + 1;
        // In AI speech, neural vocoder phase shifts violently across harmonic boundaries
        const jitter = isAi ? Math.sin(i * 1.8) * 0.8 + (Math.sin(i * 3.7) * 0.4) : Math.sin(i * 0.4) * 0.25;
        const y = midY + jitter * (h * 0.35);

        if (i === 0) c.moveTo(x, y);
        else c.lineTo(x, y);

        // Draw scatter dots on harmonic peaks
        if (i % 4 === 0) {
          c.fillStyle = isAi ? '#ef4444' : '#34d399';
          c.beginPath();
          c.arc(x, y, 2.5, 0, 2 * Math.PI);
          c.fill();
        }
      }
      c.stroke();

      // Legend
      c.fillStyle = '#94a3b8';
      c.font = '10px monospace';
      c.textAlign = 'left';
      c.fillText(`Phase Inconsistency Index: ${result.spectralModality.phaseInconsistencyScore.toFixed(2)}`, 12, 18);
      c.textAlign = 'right';
      c.fillText(isAi ? 'Phase Jumps: Abnormal Vocoder Incoherence' : 'Phase Alignment: Continuous Vocal Cord Phase', w - 12, 18);
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [activeTab, rawPcm, result, isPlaying, isRecording, audioBuffer, sampleRate]);

  return (
    <div id="audio-visualizer-container" className="rounded-xl border border-slate-800 bg-slate-900/90 shadow-xl overflow-hidden backdrop-blur">
      {/* Top Bar with Modes and Playback */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800/80 px-4 py-2.5 bg-slate-950/60">
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
            <button
              id="tab-waveform"
              type="button"
              onClick={() => setActiveTab('WAVEFORM')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'WAVEFORM'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Time Oscilloscope</span>
            </button>
            <button
              id="tab-spectrogram"
              type="button"
              onClick={() => setActiveTab('SPECTROGRAM')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'SPECTROGRAM'
                  ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Mel-CQT Spectrogram</span>
            </button>
            <button
              id="tab-phase"
              type="button"
              onClick={() => setActiveTab('PHASE_VECTOR')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'PHASE_VECTOR'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Phase Inconsistency Map</span>
            </button>
          </div>
        </div>

        {/* Audio playback button */}
        <div className="flex items-center space-x-3 mt-2 sm:mt-0">
          {audioBuffer && (
            <button
              id="btn-playback-toggle"
              type="button"
              onClick={handlePlayToggle}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                isPlaying
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 hover:bg-rose-500/30'
                  : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
              }`}
            >
              {isPlaying ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
              <span>{isPlaying ? 'Stop Audio' : 'Listen Sample'}</span>
            </button>
          )}

          {isRecording && (
            <span className="flex items-center space-x-1.5 text-xs text-rose-400 font-mono bg-rose-950/50 px-2 py-1 rounded border border-rose-800/60 animate-pulse">
              <Radio className="w-3 h-3" />
              <span>LIVE MIC STREAMING</span>
            </span>
          )}
        </div>
      </div>

      {/* Main Canvas Stage */}
      <div className="relative w-full h-56 bg-slate-950">
        <canvas ref={canvasRef} id="canvas-signal-display" className="w-full h-full block" />
      </div>

      {/* Bottom Telemetry Bar */}
      {result && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-4 py-2 text-[11px] font-mono border-t border-slate-800/80 bg-slate-950/40 text-slate-400">
          <div>
            <span className="text-slate-500">Spectral Centroid:</span>{' '}
            <span className="text-cyan-300 font-semibold">{result.spectralModality.spectralCentroidHz} Hz</span>
          </div>
          <div>
            <span className="text-slate-500">Spectral Rolloff:</span>{' '}
            <span className="text-violet-300 font-semibold">{result.spectralModality.spectralRolloffHz} Hz</span>
          </div>
          <div>
            <span className="text-slate-500">Mean F0 Pitch:</span>{' '}
            <span className="text-emerald-300 font-semibold">{result.prosodicModality.fundamentalF0MeanHz} Hz (±{result.prosodicModality.f0StdDeviation}Hz)</span>
          </div>
          <div>
            <span className="text-slate-500">SNR Level:</span>{' '}
            <span className="text-amber-300 font-semibold">{result.channelModality.snrDb} dB</span>
          </div>
        </div>
      )}
    </div>
  );
};
