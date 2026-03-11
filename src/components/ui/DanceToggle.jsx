import { Pause, Play } from 'lucide-react';

export function DanceToggle({ dancePlaying, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className={`flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all
        ${dancePlaying
          ? 'border border-violet-400/20 bg-violet-500/18 text-violet-200 hover:bg-violet-500/28'
          : 'border border-orange-400/20 bg-orange-500/18 text-orange-200 hover:bg-orange-500/28'}`}
    >
      {dancePlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      {dancePlaying ? 'Pause Dance' : 'T-Pose'}
    </button>
  );
}
