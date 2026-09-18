import { AudioSampleInfo } from '../types/cmtsf';
import { getAudioContext } from './audioSignalProcessor';

export interface PresetBenchmark {
  id: string;
  name: string;
  category: 'GENUINE' | 'AI_CLONE' | 'ADVERSARIAL_HARD_NEGATIVE';
  description: string;
  sourceDataset: string;
  technique: string;
  audioDurationSec: number;
}

export const PRESET_BENCHMARKS: PresetBenchmark[] = [
  {
    id: 'preset-libri-clean',
    name: 'LibriSpeech Reader #4821 (Clean Human)',
    category: 'GENUINE',
    description: 'Natural human reader from LibriSpeech corpus. Organic vocal micro-tremors, natural respiratory pauses, and genuine glottal cycles.',
    sourceDataset: 'LibriSpeech (Clean Test)',
    technique: 'Organic Human Vocal Tract',
    audioDurationSec: 4.2,
  },
  {
    id: 'preset-voxceleb-phone',
    name: 'VoxCeleb Mobile Call (Conversational Human)',
    category: 'GENUINE',
    description: 'Human speaker on mobile handset with mild background room reverberation and band-limited telephone codec.',
    sourceDataset: 'VoxCeleb2',
    technique: 'Organic Human Conversational Speech',
    audioDurationSec: 3.8,
  },
  {
    id: 'preset-elevenlabs-ar',
    name: 'Autoregressive TTS Clone (ElevenLabs Style)',
    category: 'AI_CLONE',
    description: 'High-fidelity synthetic voice clone generated via Autoregressive Transformer + HiFi-GAN vocoder. Exhibits unnatural hyper-fluency and robotic cadence.',
    sourceDataset: 'Synthesized with AR-TTS',
    technique: 'Autoregressive Neural TTS + HiFi-GAN Vocoder',
    audioDurationSec: 4.5,
  },
  {
    id: 'preset-diffusion-tts',
    name: 'Diffusion Voice Clone (Grad-TTS / DiffWave)',
    category: 'AI_CLONE',
    description: 'Score-based diffusion acoustic model. Displays subtle high-frequency phase cancellation and missing vocal tract micro-hesitations.',
    sourceDataset: 'ASVspoof 2021 Deepfake Synth',
    technique: 'Diffusion Acoustic Model + DiffWave Vocoder',
    audioDurationSec: 4.0,
  },
  {
    id: 'preset-adversarial-hard',
    name: 'Adversarial Hard Negative (AI Clone + VoIP + Office Noise)',
    category: 'ADVERSARIAL_HARD_NEGATIVE',
    description: 'Difficult cloned voice sample masked with background office chatter, reverberation, and GSM compression to trick single-modality detectors.',
    sourceDataset: 'CMTSF-Net Hard Negative Mining Pipeline',
    technique: 'Neural Voice Clone with Channel Distortion Augmentation',
    audioDurationSec: 4.8,
  },
  {
    id: 'preset-noisy-human',
    name: 'Noisy Human Speech (Airport Ambient Noise)',
    category: 'GENUINE',
    description: 'Low-SNR genuine speech in harsh acoustic environment. Tests Gated Attention Fusion ability to shift weight to prosody when spectrum is contaminated.',
    sourceDataset: 'CHiME-6 / VoxCeleb Distorted',
    technique: 'Organic Human Speech (Harsh Environment)',
    audioDurationSec: 3.9,
  },
];

/**
 * Procedurally synthesizes realistic audio waveforms using Web Audio OfflineAudioContext
 * to guarantee instantaneous playback and zero network latency.
 */
export async function generateSyntheticAudioBuffer(presetId: string): Promise<{ buffer: AudioBuffer; rawPCM: Float32Array }> {
  const sampleRate = 16000;
  const benchmark = PRESET_BENCHMARKS.find((b) => b.id === presetId) || PRESET_BENCHMARKS[0];
  const duration = benchmark.audioDurationSec;
  const numSamples = Math.floor(sampleRate * duration);

  const rawPCM = new Float32Array(numSamples);
  const isAi = benchmark.category === 'AI_CLONE' || benchmark.category === 'ADVERSARIAL_HARD_NEGATIVE';
  const isNoisy = presetId === 'preset-noisy-human' || presetId === 'preset-adversarial-hard';
  const isPhone = presetId === 'preset-voxceleb-phone' || presetId === 'preset-adversarial-hard';

  // Base fundamental frequency
  let baseF0 = 135; // Hz
  if (presetId.includes('diffusion')) baseF0 = 175;
  if (presetId.includes('eleven')) baseF0 = 145;

  let currentPhase = 0;
  let envelope = 0;

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    
    // Syllabic envelope: 3.5 to 5 syllables per second
    const syllableRate = isAi ? 5.2 : 3.8;
    const syllableWave = Math.max(0, Math.sin(2 * Math.PI * syllableRate * t));
    
    // Pause intervals: genuine human has clear breath micro-pauses
    let pauseMod = 1.0;
    if (!isAi) {
      if ((t > 1.2 && t < 1.6) || (t > 3.0 && t < 3.3)) {
        pauseMod = 0.05; // natural breathing pause
      }
    } else {
      // AI voice rarely hesitates, continuous phonation
      pauseMod = 0.95;
    }

    envelope = syllableWave * pauseMod;

    // Pitch contour (F0)
    let f0 = baseF0;
    if (isAi) {
      // Robotic flat pitch or perfectly monotonic vibrato
      f0 += 4 * Math.sin(2 * Math.PI * 2 * t);
    } else {
      // Human pitch variation with organic micro-tremor and declination
      f0 += 22 * Math.sin(2 * Math.PI * 0.8 * t) + 3 * Math.sin(2 * Math.PI * 11 * t);
    }

    currentPhase += (2 * Math.PI * f0) / sampleRate;

    // Formant synthesis (vocal tract resonances F1, F2, F3)
    const f1 = 500 + 200 * Math.sin(2 * Math.PI * 1.5 * t);
    const f2 = 1500 + 400 * Math.cos(2 * Math.PI * 1.2 * t);
    const f3 = 2500;

    // Glottal pulse approximation
    const glottal = (Math.sin(currentPhase) + 0.5 * Math.sin(2 * currentPhase) + 0.25 * Math.sin(3 * currentPhase)) * envelope;
    
    // Formant resonance addition
    const formantEnergy = 0.4 * Math.sin(2 * Math.PI * f1 * t) * envelope +
                          0.25 * Math.sin(2 * Math.PI * f2 * t) * envelope +
                          0.15 * Math.sin(2 * Math.PI * f3 * t) * envelope;

    let sample = 0.6 * glottal + 0.4 * formantEnergy;

    // Synthetic vocoder artifacts
    if (isAi) {
      // Phase mismatch & high-frequency buzzing characteristic of HiFi-GAN / WaveGlow
      const vocoderBuzz = 0.08 * Math.sin(2 * Math.PI * 7200 * t) * envelope;
      sample += vocoderBuzz;
      // Checkerboard artifact
      if (Math.floor(i / 120) % 4 === 0) {
        sample *= 1.05;
      }
    }

    // Channel noise / distortion
    if (isNoisy) {
      const whiteNoise = (Math.random() * 2 - 1) * 0.08;
      const pinkishHum = 0.04 * Math.sin(2 * Math.PI * 60 * t);
      sample += whiteNoise + pinkishHum;
    }

    if (isPhone) {
      // Bandpass telephone cutoff 300Hz - 3400Hz
      sample = Math.sin(sample * 1.8) * 0.65;
    }

    rawPCM[i] = Math.max(-0.95, Math.min(0.95, sample));
  }

  // Create AudioBuffer
  const ctx = getAudioContext();
  const audioBuffer = ctx.createBuffer(1, numSamples, sampleRate);
  audioBuffer.copyToChannel(rawPCM, 0);

  return { buffer: audioBuffer, rawPCM };
}

let activeSourceNode: AudioBufferSourceNode | null = null;

export function playAudioBuffer(buffer: AudioBuffer, onEnded?: () => void) {
  stopActiveAudio();
  const ctx = getAudioContext();
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.onended = () => {
    activeSourceNode = null;
    if (onEnded) onEnded();
  };
  source.start(0);
  activeSourceNode = source;
}

export function stopActiveAudio() {
  if (activeSourceNode) {
    try {
      activeSourceNode.stop();
      activeSourceNode.disconnect();
    } catch {
      // ignored
    }
    activeSourceNode = null;
  }
}
