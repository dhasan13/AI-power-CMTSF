import { jsPDF } from 'jspdf';
import { CMTSFDetectionResult } from '../types/cmtsf';

export interface Mp3AnalysisResponse {
  analysis_id: string;
  filename: string;
  duration_sec: number;
  sample_rate: number;
  channels: number;
  verdict: 'Likely Human Voice' | 'Likely AI-Generated Voice' | 'Suspicious / Inconclusive';
  confidence: number;
  risk_level: 'Low' | 'Medium' | 'High' | 'Critical';
  ai_probability: number;
  human_probability: number;
  spectral_score: number;
  prosodic_score: number;
  channel_score: number;
  audio_quality: number;
  is_demo_mode: boolean;
  demo_mode_banner: string;
  explanation: string[];
  disclaimer: string;
  spectral_findings: {
    spectral_centroid_hz: number;
    spectral_rolloff_hz: number;
    spectral_flatness: number;
    high_freq_energy_ratio: number;
    anomalies: string[];
  };
  prosodic_findings: {
    f0_mean_hz: number;
    f0_std_dev: number;
    speaking_rate_wpm: number;
    pause_duration_sec: number;
    rhythm_regularity: number;
    behavioral_notes: string[];
  };
  channel_findings: {
    snr_db: number;
    noise_floor_dbfs: number;
    reverb_rt60_sec: number;
    compression_artifact_index: number;
    channel_diagnosis: string;
  };
  gated_weights: {
    spectral: number;
    prosodic: number;
    channel: number;
  };
  timestamp: string;
}

/**
 * Downloads a structured JSON forensic report
 */
export function downloadJsonReport(data: Mp3AnalysisResponse): void {
  const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
    JSON.stringify(data, null, 2)
  )}`;
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', jsonString);
  downloadAnchor.setAttribute('download', `CMTSF-Net-Report-${data.analysis_id || Date.now()}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

/**
 * Downloads a comprehensive, high-resolution forensic PDF report
 */
export function downloadPdfReport(data: Mp3AnalysisResponse): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // Header Banner
  doc.setFillColor(15, 23, 42); // #0f172a
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('CMTSF-Net Forensic Audio Authenticity Report', margin, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('Contextual Multimodal Temporal Spectral Fusion Network • Model Prediction Dossier', margin, 18);

  // Top-right meta
  doc.setTextColor(203, 213, 225);
  doc.setFontSize(7.5);
  doc.text(`ID: ${data.analysis_id}`, pageWidth - margin, 11, { align: 'right' });
  doc.text(`Generated: ${new Date(data.timestamp).toLocaleString()}`, pageWidth - margin, 16, { align: 'right' });
  doc.text(`Mode: ${data.is_demo_mode ? 'Demo Mode (Deterministic Baseline)' : 'Trained Checkpoint'}`, pageWidth - margin, 21, { align: 'right' });

  let yPos = 35;

  // Demo Mode Banner if active
  if (data.is_demo_mode) {
    doc.setFillColor(254, 243, 199); // yellow-100
    doc.setDrawColor(245, 158, 11); // amber-500
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, yPos, contentWidth, 12, 2, 2, 'FD');

    doc.setTextColor(146, 64, 14); // amber-800
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('PROTOTYPE NOTICE: Demo Mode — Replace with trained CMTSF-Net models for real evaluation.', margin + 4, yPos + 7);
    yPos += 17;
  }

  // Primary Verdict Card
  const isAi = data.verdict === 'Likely AI-Generated Voice';
  const isSus = data.verdict === 'Suspicious / Inconclusive';
  const verdictBg = isAi ? [254, 242, 242] : isSus ? [254, 252, 232] : [240, 253, 244];
  const verdictBorder = isAi ? [239, 68, 68] : isSus ? [234, 179, 8] : [34, 197, 94];
  const verdictText = isAi ? [185, 28, 28] : isSus ? [161, 98, 7] : [21, 128, 61];

  doc.setFillColor(verdictBg[0], verdictBg[1], verdictBg[2]);
  doc.setDrawColor(verdictBorder[0], verdictBorder[1], verdictBorder[2]);
  doc.setLineWidth(0.8);
  doc.roundedRect(margin, yPos, contentWidth, 32, 3, 3, 'FD');

  doc.setTextColor(verdictText[0], verdictText[1], verdictText[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(data.verdict.toUpperCase(), margin + 6, yPos + 10);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Confidence: ${data.confidence.toFixed(1)}%   |   Risk Level: ${data.risk_level.toUpperCase()}   |   AI Probability: ${data.ai_probability.toFixed(1)}%   |   Human Probability: ${data.human_probability.toFixed(1)}%`,
    margin + 6,
    yPos + 18
  );

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `File: ${data.filename}   •   Duration: ${data.duration_sec.toFixed(2)}s   •   Sample Rate: ${data.sample_rate} Hz Mono`,
    margin + 6,
    yPos + 25
  );

  yPos += 38;

  // Fusion Weights & Internal Scores
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, yPos, contentWidth, 20, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('GATED ATTENTION FUSION & MODALITY INTERNAL SCORES', margin + 5, yPos + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  const scoreText = `Spectral Score: ${data.spectral_score.toFixed(1)}% (wt: ${(data.gated_weights.spectral * 100).toFixed(0)}%)   |   Prosodic Score: ${data.prosodic_score.toFixed(1)}% (wt: ${(data.gated_weights.prosodic * 100).toFixed(0)}%)   |   Channel Score: ${data.channel_score.toFixed(1)}% (wt: ${(data.gated_weights.channel * 100).toFixed(0)}%)   |   Audio Quality: ${data.audio_quality.toFixed(1)}%`;
  doc.text(scoreText, margin + 5, yPos + 14);

  yPos += 26;

  // Modality Breakdown 3-Columns
  const colWidth = (contentWidth - 6) / 3;

  // Col 1: Spectral
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, yPos, colWidth, 48, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('Modality A: Spectral', margin + 4, yPos + 7);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Centroid: ${data.spectral_findings.spectral_centroid_hz.toFixed(0)} Hz`, margin + 4, yPos + 15);
  doc.text(`Rolloff (85%): ${data.spectral_findings.spectral_rolloff_hz.toFixed(0)} Hz`, margin + 4, yPos + 21);
  doc.text(`Spectral Flatness: ${data.spectral_findings.spectral_flatness.toFixed(4)}`, margin + 4, yPos + 27);
  doc.text(`High-Freq Ratio: ${(data.spectral_findings.high_freq_energy_ratio * 100).toFixed(1)}%`, margin + 4, yPos + 33);
  doc.setTextColor(225, 29, 72);
  const specAnomaly = data.spectral_findings.anomalies[0] || 'Nominal frequency structure';
  doc.text(doc.splitTextToSize(specAnomaly, colWidth - 8), margin + 4, yPos + 40);

  // Col 2: Prosodic
  const col2X = margin + colWidth + 3;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(col2X, yPos, colWidth, 48, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('Modality B: Prosodic', col2X + 4, yPos + 7);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Mean F0 Pitch: ${data.prosodic_findings.f0_mean_hz.toFixed(1)} Hz`, col2X + 4, yPos + 15);
  doc.text(`F0 Std Dev: ${data.prosodic_findings.f0_std_dev.toFixed(1)} Hz`, col2X + 4, yPos + 21);
  doc.text(`Speaking Rate: ~${data.prosodic_findings.speaking_rate_wpm} WPM`, col2X + 4, yPos + 27);
  doc.text(`Rhythm Regularity: ${(data.prosodic_findings.rhythm_regularity * 100).toFixed(0)}%`, col2X + 4, yPos + 33);
  doc.setTextColor(217, 119, 6);
  const prosNote = data.prosodic_findings.behavioral_notes[0] || 'Natural dynamic inflection';
  doc.text(doc.splitTextToSize(prosNote, colWidth - 8), col2X + 4, yPos + 40);

  // Col 3: Channel
  const col3X = margin + (colWidth + 3) * 2;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(col3X, yPos, colWidth, 48, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('Modality C: Channel', col3X + 4, yPos + 7);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`SNR: ${data.channel_findings.snr_db.toFixed(1)} dB`, col3X + 4, yPos + 15);
  doc.text(`Noise Floor: ${data.channel_findings.noise_floor_dbfs.toFixed(1)} dBFS`, col3X + 4, yPos + 21);
  doc.text(`Reverb RT60: ${data.channel_findings.reverb_rt60_sec.toFixed(2)}s`, col3X + 4, yPos + 27);
  doc.text(`Artifact Index: ${data.channel_findings.compression_artifact_index.toFixed(2)}`, col3X + 4, yPos + 33);
  doc.setTextColor(71, 85, 105);
  const chanDiag = data.channel_findings.channel_diagnosis || 'Clean transmission';
  doc.text(doc.splitTextToSize(chanDiag, colWidth - 8), col3X + 4, yPos + 40);

  yPos += 54;

  // Explainable AI Section
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, yPos, contentWidth, 38, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('EXPLAINABLE AI (XAI) DECISION DRIVERS', margin + 6, yPos + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  data.explanation.forEach((exp, idx) => {
    doc.text(`• ${exp}`, margin + 8, yPos + 15 + idx * 6);
  });

  yPos += 44;

  // Disclaimer and Limitations Footer
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 6;

  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.setFont('helvetica', 'italic');
  doc.text(
    `DISCLAIMER: ${data.disclaimer}`,
    margin,
    yPos,
    { maxWidth: contentWidth }
  );
  yPos += 8;
  doc.text(
    'LIMITATIONS: Acoustic and prosodic metrics are non-deterministic proxies. Highly compressed audio, noisy rooms, or phone codec downsampling can affect feature extraction. Always perform multi-factor human verification.',
    margin,
    yPos,
    { maxWidth: contentWidth }
  );

  doc.save(`CMTSF-Net-Forensic-Report-${data.analysis_id}.pdf`);
}
