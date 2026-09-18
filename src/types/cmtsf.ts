export type ThreatLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ClassificationType = 'GENUINE_HUMAN' | 'AI_SYNTHETIC_CLONE' | 'SUSPICIOUS_UNVERIFIED';

export interface AudioSampleInfo {
  id: string;
  name: string;
  durationSec: number;
  sampleRate: number;
  channels: number;
  source: 'preset' | 'mic' | 'upload' | 'stream';
  audioBuffer?: AudioBuffer | null;
  audioUrl?: string;
  timestamp: string;
  typeLabel?: string;
}

export interface PreprocessingResult {
  originalDurationSec: number;
  processedDurationSec: number;
  vadSpeechRatio: number; // e.g. 0.88 (88% active speech)
  silenceRemovedMs: number;
  normalizedRmsDb: number;
  peakDb: number;
  resampledTo16k: boolean;
  preEmphasisAlpha: number;
}

export interface ModalityASpectral {
  cqtEnergyBands: number[]; // 12-24 pitch bins
  melSpectrogramSnapshot: number[][]; // 2D matrix for heatmap
  phaseDeviationMap: number[];
  spectralCentroidHz: number; // e.g. 2450 Hz
  spectralRolloffHz: number; // e.g. 5200 Hz
  spectralFlatness: number; // 0 to 1
  phaseInconsistencyScore: number; // 0 to 1 (high in neural vocoders)
  highFreqArtifactScore: number; // 0 to 1 (checkerboard artifacts from deconv)
  spectralFakeProbability: number; // 0 to 1
  featureVectorSample: number[];
  detectedAnomalies: string[];
}

export interface ModalityBProsodic {
  fundamentalF0MeanHz: number; // e.g. 142 Hz
  f0StdDeviation: number; // F0 variation
  f0Contour: number[]; // pitch track over time
  speakingRateWpm: number; // syllables / words per minute
  energyShimmer: number; // energy amplitude variability
  pitchJitter: number; // micro-variability in fundamental period
  pauseDurationTotalMs: number;
  hesitationRatio: number; // natural human fillers / micro-pauses
  zeroCrossingRate: number; // ZCR mean
  roboticRhythmIndex: number; // metronomic cadence regularity (0 to 1)
  prosodicFakeProbability: number; // 0 to 1
  featureVectorSample: number[];
  behavioralFindings: string[];
}

export interface ModalityCChannel {
  snrDb: number; // Signal-to-Noise Ratio (dB)
  backgroundNoiseFloorDb: number; // dBFS
  rt60ReverberationSec: number; // estimated room decay
  codecArtifactIndex: number; // VoIP/GSM compression artifacts (0 to 1)
  packetLossEstimatedPercent: number; // %
  jitterMs: number; // network latency variance
  environmentalRiskScore: number; // 0 to 1
  featureVectorSample: number[];
  channelDiagnosis: string;
}

export interface GatedFusionResult {
  audioQualityScore: number; // 0 (heavy noise) to 1 (studio clean)
  spectralWeight: number; // learnable dynamic weight alpha_spectral
  prosodicWeight: number; // learnable dynamic weight alpha_prosodic
  channelWeight: number; // learnable dynamic weight alpha_channel
  fusedAiLogit: number;
  realProbability: number; // 0 to 1
  aiFakeProbability: number; // 0 to 1
  confidenceScore: number; // 0 to 1
  classification: ClassificationType;
  riskLevel: ThreatLevel;
  inferenceLatencyMs: number;
  synthesisTechniqueEstimated: string;
  explanation: string;
}

export interface CMTSFDetectionResult {
  id: string;
  timestamp: string;
  sampleInfo: AudioSampleInfo;
  preprocessing: PreprocessingResult;
  spectralModality: ModalityASpectral;
  prosodicModality: ModalityBProsodic;
  channelModality: ModalityCChannel;
  fusion: GatedFusionResult;
  verifiedViaChallenge?: boolean;
}

export interface VoiceChallenge {
  id: string;
  challengeType: 'RANDOM_NUMBERS_EMOTION' | 'PHONETIC_STRESS_TASK' | 'UNEXPECTED_CADENCE';
  title: string;
  instruction: string;
  phraseToSpeak: string;
  expectedProsody: string;
  timeLimitSec: number;
}

export interface ChallengeSessionState {
  active: boolean;
  status: 'IDLE' | 'SOFT_WARNING' | 'CHALLENGE_ISSUED' | 'RECORDING_RESPONSE' | 'ANALYZING' | 'VERIFIED' | 'BLOCKED';
  currentChallenge: VoiceChallenge | null;
  timeRemainingSec: number;
  warningReason?: string;
  initialAiProbability: number;
  challengeScore?: number;
  finalDecision?: 'CLEARED' | 'BLOCKED';
}

export interface DetectionHistoryItem {
  id: string;
  timestamp: string;
  fileName: string;
  source: 'preset' | 'mic' | 'upload' | 'stream';
  aiProbability: number;
  realProbability: number;
  confidence: number;
  classification: ClassificationType;
  riskLevel: ThreatLevel;
  synthesisTechnique: string;
  weights: {
    spectral: number;
    prosodic: number;
    channel: number;
  };
}

export interface SecurityIncident {
  id: string;
  timestamp: string;
  sourceType: string;
  threatLevel: ThreatLevel;
  aiProbability: number;
  confidence: number;
  detectedSignature: string;
  actionTaken: 'BLOCKED' | 'FLAGGED' | 'WARNING_ISSUED' | 'ACTIVE_CHALLENGE_FAILED';
  rawChannelMetrics: {
    snr: number;
    jitter: number;
    packetLoss: number;
  };
}

export type LiveCallStreamStatus =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'BUFFERING'
  | 'MONITORING'
  | 'ERROR';

export interface SlidingBufferTelemetry {
  bufferedSamples: number;
  bufferedSeconds: number;
  windowDurationSec: number;
  strideDurationSec: number;
  fillPercentage: number;
  isReady: boolean;
  totalChunksReceived: number;
  windowsEmitted: number;
  streamDurationSec: number;
  currentWindowRange: string;
}

export interface LiveWindowInference {
  timestamp: string;
  window_range: string;
  ai_probability: number;
  raw_ai_probability?: number;
  real_probability: number;
  confidence: number;
  risk_level: 'LOW' | 'SUSPICIOUS' | 'HIGH' | 'CRITICAL';
  system_action: string;
  action_description: string;
  trigger_challenge: boolean;
  spectral_score: number;
  prosodic_score: number;
  channel_score: number;
  modality_weights: {
    spectral: number;
    prosodic: number;
    channel: number;
  };
  audio_quality?: {
    snr_db: number;
    quality_score: number;
    is_clipped: boolean;
  };
}

export type VoiceAuthenticityVerdict =
  | 'Likely Human Voice'
  | 'Likely AI-Generated Voice'
  | 'Suspicious / Inconclusive';

export type LiveRiskLevel = 'Low' | 'Suspicious' | 'High' | 'Critical';

export interface LiveVoiceAuthenticityResult {
  timestamp: string;
  verdict: VoiceAuthenticityVerdict;
  confidence: number; // e.g. 87.0
  ai_probability: number; // e.g. 0.87
  human_probability: number; // e.g. 0.13
  risk_level: LiveRiskLevel;
  spectral_score: number;
  prosodic_score: number;
  channel_score: number;
  audio_quality: number; // e.g. 89.0
  analysis_duration: string | number; // e.g. "4.0s"
  mode: 'Trained Model' | 'DEMO MODE — NOT VALIDATED';
}

export interface LocationInfo {
  source: 'browser_gps' | 'ip_geolocation';
  latitude: number | null;
  longitude: number | null;
  accuracy: number;
  accuracy_meters: number;
  status?: 'Active' | 'Inactive' | 'Denied' | 'Unavailable';
  city?: string;
  district?: string;
  state?: string;
  region?: string;
  country?: string;
  approximate_location?: string;
  provider?: string;
  warning?: string;
  permission: 'granted' | 'prompt' | 'denied';
  timestamp: string;
  privacy_notice: string;
}

export interface ThresholdConfig {
  lowMax: number; // default 40
  suspiciousMax: number; // default 65
  highMax: number; // default 85
}

export interface TimelineEntry {
  id: string;
  time: string;
  timestamp: string;
  verdict: VoiceAuthenticityVerdict;
  confidence: number;
  ai_probability: number;
  human_probability: number;
  risk_level: LiveRiskLevel;
}

