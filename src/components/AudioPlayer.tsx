import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, RotateCcw } from 'lucide-react';

interface AudioPlayerProps {
  file: File;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ file }) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.8);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    setIsPlaying(false);
    setCurrentTime(0);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(console.error);
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.volume = volume || 0.5;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  const formatTime = (secs: number): string => {
    const mins = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div id="audio-player-widget" className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row items-center gap-4">
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setIsPlaying(false)}
        />
      )}

      {/* Play / Pause Toggle Button */}
      <div className="flex items-center gap-2">
        <button
          id="btn-play-pause-audio"
          onClick={togglePlay}
          className="w-10 h-10 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center justify-center transition shadow-md shadow-cyan-500/20 cursor-pointer"
          title={isPlaying ? 'Pause Audio' : 'Play Audio'}
        >
          {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
        </button>

        <button
          id="btn-rewind-audio"
          onClick={() => {
            if (audioRef.current) {
              audioRef.current.currentTime = 0;
              setCurrentTime(0);
            }
          }}
          className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition"
          title="Restart playback"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Scrub Bar & Time */}
      <div className="flex-1 w-full flex items-center gap-3">
        <span className="text-xs font-mono text-slate-400 w-9 text-right">
          {formatTime(currentTime)}
        </span>

        <input
          id="audio-progress-slider"
          type="range"
          min={0}
          max={duration || 1}
          step={0.01}
          value={currentTime}
          onChange={handleSeek}
          className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
        />

        <span className="text-xs font-mono text-slate-400 w-9">
          {formatTime(duration)}
        </span>
      </div>

      {/* Volume Control */}
      <div className="flex items-center gap-2 w-full sm:w-32">
        <button
          id="btn-toggle-mute"
          onClick={toggleMute}
          className="text-slate-400 hover:text-slate-200 transition"
        >
          {isMuted || volume === 0 ? (
            <VolumeX className="w-4 h-4 text-rose-400" />
          ) : (
            <Volume2 className="w-4 h-4" />
          )}
        </button>
        <input
          id="audio-volume-slider"
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={isMuted ? 0 : volume}
          onChange={handleVolumeChange}
          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
        />
      </div>
    </div>
  );
};
