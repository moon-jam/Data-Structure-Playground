import React, { useState } from 'react';
import { 
  Undo2, Redo2, SkipBack, ChevronLeft, Pause, Play, 
  ChevronRight, SkipForward, Timer 
} from 'lucide-react';

interface PlaybackControlsProps {
  isPlaying: boolean;
  isPaused: boolean;
  onTogglePause: () => void;
  onGoToStep: (idx: number) => void;
  currentStep: number;
  totalSteps: number;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  playbackSpeed: number;
  setPlaybackSpeed: (speed: number) => void;
}

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  isPlaying, isPaused, onTogglePause, onGoToStep, 
  currentStep, totalSteps, onUndo, onRedo, 
  canUndo, canRedo, playbackSpeed, setPlaybackSpeed
}) => {
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex items-center justify-between gap-4 flex-grow">
        <div className="flex gap-1">
          <button 
            onClick={onUndo} 
            disabled={isPlaying || !canUndo} 
            className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50 text-slate-600 transition-all shadow-sm disabled:opacity-30"
          >
            <Undo2 size={16} />
          </button>
          <button 
            onClick={onRedo} 
            disabled={isPlaying || !canRedo} 
            className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50 text-slate-600 transition-all shadow-sm disabled:opacity-30"
          >
            <Redo2 size={16} />
          </button>
        </div>

        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
          <button 
            onClick={() => onGoToStep(0)} 
            disabled={totalSteps === 0} 
            className="hidden sm:block p-1.5 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-20"
          >
            <SkipBack size={14} />
          </button>
          <button 
            onClick={() => onGoToStep(currentStep - 1)} 
            disabled={totalSteps <= 0} 
            className="p-1.5 text-slate-600 hover:bg-slate-50 rounded-lg transition-all disabled:opacity-20"
          >
            <ChevronLeft size={18} />
          </button>
          <button 
            onClick={onTogglePause} 
            className="w-8 h-8 bg-slate-900 text-white rounded-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md"
          >
            {isPlaying && !isPaused ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
          </button>
          <button 
            onClick={() => onGoToStep(currentStep + 1)} 
            disabled={totalSteps <= 0} 
            className="p-1.5 text-slate-600 hover:bg-slate-50 rounded-lg transition-all disabled:opacity-20"
          >
            <ChevronRight size={18} />
          </button>
          <button 
            onClick={() => onGoToStep(totalSteps - 1)} 
            disabled={totalSteps === 0} 
            className="hidden sm:block p-1.5 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-20"
          >
            <SkipForward size={14} />
          </button>
        </div>

        <div className="relative">
          <button 
            onClick={() => setShowSpeedMenu(!showSpeedMenu)} 
            className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all shadow-sm ${showSpeedMenu ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-200 text-slate-400'}`}
          >
            <Timer size={16} />
          </button>
          {showSpeedMenu && (
            <div className="absolute bottom-full right-0 mb-2 bg-white rounded-xl shadow-2xl border border-slate-200 p-1 flex flex-col gap-0.5 z-[150] animate-in slide-in-from-bottom-2 min-w-[60px]">
              {[0.5, 1, 1.5, 2, 3].map(speed => (
                <button 
                  key={speed} 
                  onClick={() => { setPlaybackSpeed(speed); setShowSpeedMenu(false); }} 
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-colors ${playbackSpeed === speed ? 'bg-blue-600 text-white' : 'hover:bg-slate-50 text-slate-500'}`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 mt-1">
        <input 
          type="range" 
          min="0" 
          max={Math.max(0, totalSteps - 1)} 
          value={Math.max(0, currentStep)} 
          onChange={(e) => onGoToStep(parseInt(e.target.value))} 
          className="flex-grow h-1 bg-slate-200 rounded-full accent-blue-600 cursor-pointer" 
        />
      </div>
    </div>
  );
};
