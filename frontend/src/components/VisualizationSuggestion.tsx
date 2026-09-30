import React from 'react';
import type { NavTab } from './Navbar';

export interface SuggestionItem {
  targetTab: NavTab;
  promptOrSearch: string;
  name: string;
  type: 'element' | 'molecule' | 'reaction';
  details?: string;
}

interface VisualizationSuggestionProps {
  suggestion: SuggestionItem;
  onNavigateAndVisualize: (targetTab: NavTab, promptOrSearch: string) => void;
}

export const VisualizationSuggestion: React.FC<VisualizationSuggestionProps> = ({
  suggestion,
  onNavigateAndVisualize,
}) => {
  const icon =
    suggestion.type === 'element'
      ? '⚛️'
      : suggestion.type === 'reaction'
      ? '🔥'
      : '🧪';

  const typeColor =
    suggestion.type === 'element'
      ? 'from-cyan-500/20 to-teal-500/20 border-cyan-500/40 text-cyan-300'
      : suggestion.type === 'reaction'
      ? 'from-amber-500/20 to-orange-500/20 border-amber-500/40 text-amber-300'
      : 'from-emerald-500/20 to-teal-500/20 border-emerald-500/40 text-emerald-300';

  return (
    <div className={`mt-3 p-3.5 rounded-2xl bg-gradient-to-r ${typeColor} border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 backdrop-blur-md shadow-lg`}>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-center text-lg shadow-sm">
          {icon}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white font-sans">{suggestion.name}</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-950 text-slate-300 uppercase tracking-wider">
              {suggestion.type}
            </span>
          </div>
          {suggestion.details && (
            <p className="text-[11px] text-slate-300 font-mono mt-0.5 line-clamp-1">
              {suggestion.details}
            </p>
          )}
        </div>
      </div>

      <button
        onClick={() => onNavigateAndVisualize(suggestion.targetTab, suggestion.promptOrSearch)}
        className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 via-teal-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-md shadow-cyan-500/25 border border-cyan-300/40 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 hover:scale-105"
      >
        <span>⚡</span>
        <span>Visualize in 3D</span>
      </button>
    </div>
  );
};
