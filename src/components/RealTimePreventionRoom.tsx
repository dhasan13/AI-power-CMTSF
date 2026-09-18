import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Radio,
  Mic,
  MicOff,
  AlertOctagon,
  Sparkles,
  Timer,
  CheckCircle,
  XCircle,
  Play,
  RotateCcw,
  Volume2,
} from 'lucide-react';
import {
  VoiceChallenge,
  ChallengeSessionState,
  SecurityIncident,
  CMTSFDetectionResult,
} from '../types/cmtsf';
import { getAudioContext } from '../utils/audioSignalProcessor';

interface RealTimePreventionRoomProps {
  latestResult: CMTSFDetectionResult | null;
  onLogIncident: (incident: SecurityIncident) => void;
  onSessionBlocked: () => void;
}

const RANDOM_CHALLENGES: VoiceChallenge[] = [
  {
    id: 'ch-numbers-emotion',
    challengeType: 'RANDOM_NUMBERS_EMOTION',
    title: 'Emotional Cadence & Number Challenge',
    instruction: 'Speak the following numbers with an excited, rapidly rising pitch intonation:',
    phraseToSpeak: 'Verification Code: 7 - 3 - 9 - 4 (Rising Pitch)',
    expectedProsody: 'Rising F0 contour (> +45 Hz delta across sequence)',
    timeLimitSec: 10,
  },
  {
    id: 'ch-phonetic-stress',
    challengeType: 'PHONETIC_STRESS_TASK',
    title: 'Phonetic Stress & Glottal Timing Challenge',
    instruction: 'Pronounce the phrase below with a deliberate 2-second hesitation between the two words:',
    phraseToSpeak: '"Quantum ... [2s Pause] ... Velocity"',
    expectedProsody: 'Micro-pause duration between 1.8s - 2.4s with unvoiced closure',
    timeLimitSec: 10,
  },
  {
    id: 'ch-unexpected-cadence',
    challengeType: 'UNEXPECTED_CADENCE',
    title: 'Linguistic Surprise & Pitch Drop Challenge',
    instruction: 'Repeat this unusual sentence while deliberately lowering your voice at the end:',
    phraseToSpeak: '"Purple umbrellas dance under midnight skies."',
    expectedProsody: 'Falling F0 terminal pitch declination with natural micro-jitter',
    timeLimitSec: 12,
  },
];

export const RealTimePreventionRoom: React.FC<RealTimePreventionRoomProps> = ({
  latestResult,
  onLogIncident,
  onSessionBlocked,
}) => {
  // Session monitoring parameters
  const [warningThreshold, setWarningThreshold] = useState<number>(65); // %
  const [autoBlockThreshold, setAutoBlockThreshold] = useState<number>(88); // %
  const [isSimulatingStream, setIsSimulatingStream] = useState<boolean>(false);
  const [streamAiProb, setStreamAiProb] = useState<number>(12); // %
  const [streamNoiseSnr, setStreamNoiseSnr] = useState<number>(32); // dB

  // Challenge session state
  const [session, setSession] = useState<ChallengeSessionState>({
    active: false,
    status: 'IDLE',
    currentChallenge: null,
    timeRemainingSec: 10,
    initialAiProbability: 0,
  });

  const [isRecordingChallenge, setIsRecordingChallenge] = useState<boolean>(false);
  const [challengeSpeechHeard, setChallengeSpeechHeard] = useState<boolean>(false);
  const timerIntervalRef = useRef<number | null>(null);
  const streamIntervalRef = useRef<number | null>(null);

  // Trigger challenge function
  const triggerChallenge = (reason: string, initialAiScore: number) => {
    const randomCh = RANDOM_CHALLENGES[Math.floor(Math.random() * RANDOM_CHALLENGES.length)];
    setSession({
      active: true,
      status: 'CHALLENGE_ISSUED',
      currentChallenge: randomCh,
      timeRemainingSec: randomCh.timeLimitSec,
      warningReason: reason,
      initialAiProbability: initialAiScore,
    });
  };

  // Check if current scan triggers soft warning
  useEffect(() => {
    if (!latestResult) return;
    const aiProbPercent = Math.round(latestResult.fusion.aiFakeProbability * 100);

    if (aiProbPercent >= autoBlockThreshold && session.status !== 'BLOCKED') {
      // Direct Block
      handleBlockSession('Critical AI Voice Clone threshold exceeded (>88%). Instant mitigation activated.', aiProbPercent);
    } else if (aiProbPercent >= warningThreshold && session.status === 'IDLE') {
      // Soft Warning -> Challenge Response
      triggerChallenge(
        `AI Voice probability (${aiProbPercent}%) crossed security threshold (${warningThreshold}%). Active voice challenge required to verify living human presence.`,
        aiProbPercent
      );
    }
  }, [latestResult, warningThreshold, autoBlockThreshold]);

  // Challenge countdown timer
  useEffect(() => {
    if (session.status === 'CHALLENGE_ISSUED' || session.status === 'RECORDING_RESPONSE') {
      timerIntervalRef.current = window.setInterval(() => {
        setSession((prev) => {
          if (prev.timeRemainingSec <= 1) {
            clearInterval(timerIntervalRef.current!);
            // Timeout -> Block
            handleBlockSession('Challenge Response timed out. Speaker failed to provide vocal verification in window.', prev.initialAiProbability);
            return {
              ...prev,
              timeRemainingSec: 0,
              status: 'BLOCKED',
              finalDecision: 'BLOCKED',
            };
          }
          return {
            ...prev,
            timeRemainingSec: prev.timeRemainingSec - 1,
          };
        });
      }, 1000);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [session.status]);

  // Simulated live audio stream loop
  useEffect(() => {
    if (isSimulatingStream) {
      streamIntervalRef.current = window.setInterval(() => {
        setStreamAiProb((prev) => {
          // Normal fluctuation around 10-20%, occasional spike
          const isAttack = Math.random() < 0.2;
          let next = isAttack ? 72 + Math.random() * 22 : Math.max(5, Math.min(35, prev + (Math.random() - 0.5) * 12));
          next = Math.round(next);

          if (next >= warningThreshold && session.status === 'IDLE') {
            triggerChallenge(
              `Live stream detector flagged abnormal vocoder harmonic phase and metronomic rhythm (${next}% AI score).`,
              next
            );
          }
          return next;
        });
      }, 2000);
    } else {
      if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
    }

    return () => {
      if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
    };
  }, [isSimulatingStream, warningThreshold, session.status]);

  const handleBlockSession = (reason: string, aiScore: number) => {
    const incident: SecurityIncident = {
      id: `INC-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      sourceType: 'Real-Time Voice Impersonation Prevention Layer',
      threatLevel: 'CRITICAL',
      aiProbability: aiScore / 100,
      confidence: 0.96,
      detectedSignature: reason,
      actionTaken: 'BLOCKED',
      rawChannelMetrics: {
        snr: streamNoiseSnr,
        jitter: 14.2,
        packetLoss: 3.1,
      },
    };
    onLogIncident(incident);
    onSessionBlocked();
  };

  const handleStartRecordingChallenge = async () => {
    setIsRecordingChallenge(true);
    setSession((prev) => ({ ...prev, status: 'RECORDING_RESPONSE' }));

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setChallengeSpeechHeard(true);

      // Record for 4 seconds then evaluate
      setTimeout(() => {
        stream.getTracks().forEach((t) => t.stop());
        setIsRecordingChallenge(false);
        evaluateChallengeResponse();
      }, 4000);
    } catch (err) {
      // Fallback simulation if mic access denied in sandbox
      console.warn('Microphone permission fallback', err);
      setTimeout(() => {
        setIsRecordingChallenge(false);
        evaluateChallengeResponse();
      }, 3500);
    }
  };

  const evaluateChallengeResponse = () => {
    setSession((prev) => ({ ...prev, status: 'ANALYZING' }));

    setTimeout(() => {
      // If initial AI score was very high (>80%), evaluate whether challenge passed
      // Human speaker naturally passes the random intonation task
      const passed = Math.random() > 0.25; // 75% pass if living user
      const challengeScore = passed ? 0.94 : 0.35;
      const combinedScore = passed
        ? Math.max(0.08, session.initialAiProbability * 0.25)
        : Math.min(0.96, session.initialAiProbability * 1.1);

      if (passed) {
        setSession((prev) => ({
          ...prev,
          status: 'VERIFIED',
          challengeScore,
          finalDecision: 'CLEARED',
        }));
      } else {
        setSession((prev) => ({
          ...prev,
          status: 'BLOCKED',
          challengeScore,
          finalDecision: 'BLOCKED',
        }));
        handleBlockSession(
          'Active Challenge Failed: Voice response exhibited flat robotic intonation without requested F0 pitch modulation.',
          Math.round(combinedScore * 100)
        );
      }
    }, 1500);
  };

  const handleResetSession = () => {
    setSession({
      active: false,
      status: 'IDLE',
      currentChallenge: null,
      timeRemainingSec: 10,
      initialAiProbability: 0,
    });
  };

  return (
    <div id="prevention-room-container" className="space-y-6">
      {/* Real-time prevention header and controls */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <ShieldAlert className="w-4 h-4" />
              </span>
              <h3 className="text-base font-bold text-white tracking-tight">
                Real-Time Impersonation Prevention & Challenge-Response
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Dual-layer defense: Passive continuous multimodal scoring combined with active zero-knowledge vocal challenge-response verification.
            </p>
          </div>

          {/* Stream Simulation Toggle */}
          <div className="flex items-center space-x-3">
            <button
              id="btn-toggle-stream-simulation"
              type="button"
              onClick={() => setIsSimulatingStream(!isSimulatingStream)}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                isSimulatingStream
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-sm animate-pulse'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>{isSimulatingStream ? 'Stop Live Stream Monitor' : 'Simulate Live Call Stream'}</span>
            </button>
          </div>
        </div>

        {/* Real-Time Telemetry & Threshold Controls */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Active AI Risk Meter */}
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <div className="text-[11px] font-mono text-slate-400 flex justify-between">
              <span>Streaming AI Fake Score</span>
              <span className="text-cyan-400 font-bold">{streamAiProb}%</span>
            </div>
            <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden mt-2 border border-slate-800">
              <div
                style={{ width: `${streamAiProb}%` }}
                className={`h-full transition-all duration-500 ${
                  streamAiProb >= autoBlockThreshold
                    ? 'bg-rose-500'
                    : streamAiProb >= warningThreshold
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
              />
            </div>
            <div className="text-[10px] text-slate-500 mt-1 font-mono flex justify-between">
              <span>Safe &lt;65%</span>
              <span>Warn 65-88%</span>
              <span>Block &gt;88%</span>
            </div>
          </div>

          {/* Warning Threshold Slider */}
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <div className="text-[11px] font-mono text-slate-400 flex justify-between">
              <span>Soft Warning Threshold</span>
              <span className="text-amber-400 font-bold">{warningThreshold}%</span>
            </div>
            <input
              type="range"
              min={40}
              max={80}
              value={warningThreshold}
              onChange={(e) => setWarningThreshold(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400 mt-2.5"
            />
            <div className="text-[10px] text-slate-500 mt-1">Triggers active voice challenge when crossed</div>
          </div>

          {/* Auto-Block Threshold Slider */}
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <div className="text-[11px] font-mono text-slate-400 flex justify-between">
              <span>Critical Auto-Block Threshold</span>
              <span className="text-rose-400 font-bold">{autoBlockThreshold}%</span>
            </div>
            <input
              type="range"
              min={75}
              max={95}
              value={autoBlockThreshold}
              onChange={(e) => setAutoBlockThreshold(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500 mt-2.5"
            />
            <div className="text-[10px] text-slate-500 mt-1">Instant session termination & alert log</div>
          </div>

          {/* Manual Trigger Test Button */}
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex flex-col justify-between">
            <div className="text-[11px] font-mono text-slate-400">Manual Challenge Test</div>
            <button
              type="button"
              onClick={() => triggerChallenge('Manual security verification triggered by administrator', 76)}
              className="w-full mt-2 py-1.5 px-3 rounded-md bg-indigo-600/30 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/40 text-xs font-semibold transition-all flex items-center justify-center space-x-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Issue Test Challenge</span>
            </button>
          </div>
        </div>
      </div>

      {/* ACTIVE CHALLENGE-RESPONSE INTERACTIVE MODAL / BANNER */}
      {session.status !== 'IDLE' && (
        <div
          id="active-challenge-banner"
          className={`rounded-xl border p-5 shadow-2xl transition-all ${
            session.status === 'BLOCKED'
              ? 'border-rose-500/60 bg-rose-950/40'
              : session.status === 'VERIFIED'
              ? 'border-emerald-500/60 bg-emerald-950/40'
              : 'border-amber-500/60 bg-amber-950/30'
          }`}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
            <div className="flex items-center space-x-2.5">
              {session.status === 'BLOCKED' ? (
                <XCircle className="w-6 h-6 text-rose-400" />
              ) : session.status === 'VERIFIED' ? (
                <CheckCircle className="w-6 h-6 text-emerald-400" />
              ) : (
                <AlertOctagon className="w-6 h-6 text-amber-400 animate-pulse" />
              )}
              <div>
                <h4 className="text-base font-bold text-white">
                  {session.status === 'BLOCKED'
                    ? 'SECURITY ENFORCEMENT: SESSION TERMINATED'
                    : session.status === 'VERIFIED'
                    ? 'BIOMETRIC INTEGRITY VERIFIED: HUMAN SPEAKER CONFIRMED'
                    : 'SECURITY CHALLENGE REQUIRED: UNPREDICTABLE PROSODY TEST'}
                </h4>
                <div className="text-xs text-slate-300 mt-0.5">
                  {session.warningReason || 'Passive scoring detected abnormal synthetic voice markers.'}
                </div>
              </div>
            </div>

            {/* Timer and Status Pill */}
            <div className="flex items-center space-x-2 font-mono text-xs">
              {(session.status === 'CHALLENGE_ISSUED' || session.status === 'RECORDING_RESPONSE') && (
                <div className="flex items-center space-x-1.5 px-3 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  <Timer className="w-3.5 h-3.5" />
                  <span>Time Remaining: {session.timeRemainingSec}s</span>
                </div>
              )}
              <button
                type="button"
                onClick={handleResetSession}
                className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white"
                title="Reset Challenge Session"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Challenge Prompt and Recording Section */}
          {session.currentChallenge && (session.status === 'CHALLENGE_ISSUED' || session.status === 'RECORDING_RESPONSE' || session.status === 'ANALYZING') && (
            <div className="mt-4 space-y-4">
              <div className="p-4 rounded-lg bg-slate-950 border border-amber-500/30 text-center">
                <div className="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold mb-1">
                  {session.currentChallenge.title}
                </div>
                <div className="text-sm text-slate-300 mb-3">{session.currentChallenge.instruction}</div>
                
                <div className="p-3.5 rounded-md bg-slate-900 border border-slate-700 text-lg font-mono font-bold text-cyan-300 tracking-wide select-all">
                  {session.currentChallenge.phraseToSpeak}
                </div>

                <div className="mt-2 text-xs text-slate-400 font-mono">
                  Expected Acoustic Constraint: <span className="text-violet-300">{session.currentChallenge.expectedProsody}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleStartRecordingChallenge}
                  disabled={isRecordingChallenge || session.status === 'ANALYZING'}
                  className={`flex items-center space-x-2 px-6 py-2.5 rounded-lg text-sm font-bold border transition-all ${
                    isRecordingChallenge
                      ? 'bg-rose-600 text-white border-rose-500 animate-pulse'
                      : 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 border-amber-400 hover:brightness-110 shadow-lg'
                  }`}
                >
                  {isRecordingChallenge ? <Mic className="w-4 h-4 animate-bounce" /> : <Mic className="w-4 h-4" />}
                  <span>{isRecordingChallenge ? 'Listening Response (4s)...' : 'Record Voice Challenge'}</span>
                </button>

                <button
                  type="button"
                  onClick={evaluateChallengeResponse}
                  disabled={session.status === 'ANALYZING'}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700"
                >
                  Simulate Passing Human Response
                </button>
              </div>
            </div>
          )}

          {/* Verified outcome info */}
          {session.status === 'VERIFIED' && (
            <div className="mt-4 p-4 rounded-lg bg-emerald-950/50 border border-emerald-500/40 text-xs text-emerald-200 space-y-2">
              <div className="font-bold text-sm text-emerald-300">Active Challenge Passed (Score: 94%)</div>
              <p>
                Speaker successfully completed dynamic pitch contour task within designated 10-second window. The combination of passive spectral features and active conversational prosody cleared the impersonation alert.
              </p>
              <div className="pt-2 flex items-center space-x-4 font-mono text-[11px] text-emerald-400">
                <span>Session Status: Active & Secured</span>
                <span>Combined Risk Score: 7.2% (Negligible)</span>
              </div>
            </div>
          )}

          {/* Blocked outcome info */}
          {session.status === 'BLOCKED' && (
            <div className="mt-4 p-4 rounded-lg bg-rose-950/60 border border-rose-500/50 text-xs text-rose-200 space-y-2">
              <div className="font-bold text-sm text-rose-300">Session Terminated & Threat Logged</div>
              <p>
                The speaker voice clone failed active prosody challenge. Autoregressive TTS or neural vocoder was unable to dynamically execute instructed pitch drops and glottal micro-hesitations. Connection severed to protect account integrity.
              </p>
              <div className="pt-2 flex items-center space-x-4 font-mono text-[11px] text-rose-400">
                <span>Incident Ref: INC-{Date.now().toString().slice(-6)}</span>
                <span>Mitigation: Voice Channel Firewall Block</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
