import React from 'react';

interface ReactionTimelineControlsProps {
  isPlaying: boolean;
  progress: number;
  speed: number;
  currentStageName: string;
  stageDescription: string;
  stages: string[];
  currentStageIndex: number;
  onTogglePlay: () => void;
  onReset: () => void;
  onProgressChange: (newProgress: number) => void;
  onSpeedChange: (newSpeed: number) => void;
}

export const ReactionTimelineControls: React.FC<ReactionTimelineControlsProps> = ({
  isPlaying,
  progress,
  speed,
  currentStageName,
  stageDescription,
  stages,
  currentStageIndex,
  onTogglePlay,
  onReset,
  onProgressChange,
  onSpeedChange,
}) => {
  const percentage = Math.round(progress * 100);

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl backdrop-blur-md flex flex-col gap-3">
      {/* Top Header: Active Stage Badge & Playback Speed */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider">
            Stage {currentStageIndex + 1} of {stages.length || 3}:
          </span>
          <span className="text-sm font-semibold text-slate-100">{currentStageName}</span>
        </div>

        {/* Playback Speed Selector */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <span className="text-[11px] text-slate-400 font-mono">Speed:</span>
          {[0.25, 0.5, 1.0, 2.0].map((s) => (
            <button
              key={`speed-${s}`}
              onClick={() => onSpeedChange(s)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition cursor-pointer ${
                speed === s
                  ? 'bg-cyan-600 text-white font-bold shadow'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* Progress Bar & Slider */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-mono text-cyan-400 w-10 text-right font-bold">{percentage}%</span>

        <div className="relative flex-1 flex items-center">
          <input
            type="range"
            min="0"
            max="1"
            step="0.005"
            value={progress}
            onChange={(e) => onProgressChange(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>
      </div>

      {/* Mechanism Stage Step Markers */}
      {stages && stages.length > 0 && (
        <div className="grid grid-cols-3 gap-1.5 pt-1">
          {stages.slice(0, 3).map((stg, idx) => {
            const isActive = currentStageIndex === idx;
            return (
              <div
                key={`stage-marker-${idx}`}
                className={`p-2 rounded-lg border text-xs transition ${
                  isActive
                    ? 'bg-cyan-950/60 border-cyan-500/80 text-cyan-200 shadow-md'
                    : 'bg-slate-950/60 border-slate-800/80 text-slate-400'
                }`}
              >
                <div className="font-mono text-[10px] font-bold uppercase opacity-80">Step {idx + 1}</div>
                <div className="font-medium truncate mt-0.5">{stg}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Playback Action Buttons & Stage Description */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 border-t border-slate-800/60">
        <div className="flex items-center gap-2">
          {/* Play/Pause Toggle */}
          <button
            onClick={onTogglePlay}
            className={`px-4 py-2 rounded-lg text-xs font-bold font-mono transition flex items-center gap-2 shadow-lg cursor-pointer ${
              isPlaying
                ? 'bg-amber-600 hover:bg-amber-500 text-white border border-amber-400'
                : 'bg-cyan-600 hover:bg-cyan-500 text-white border border-cyan-400'
            }`}
          >
            {isPlaying ? (
              <>
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
                Pause
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Play Reaction
              </>
            )}
          </button>

          {/* Reset/Rewind */}
          <button
            onClick={onReset}
            className="px-3 py-2 bg-slate-950 hover:bg-slate-800 text-slate-300 text-xs font-mono rounded-lg border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
            title="Reset Timeline to 0%"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reset
          </button>
        </div>

        {/* Stage Description Text */}
        <p className="text-xs text-slate-400 leading-relaxed italic text-right flex-1 truncate" title={stageDescription}>
          {stageDescription}
        </p>
      </div>
    </div>
  );
};
