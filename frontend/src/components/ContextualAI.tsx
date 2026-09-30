
import React from 'react';

interface ContextualAIProps {
  title?: string;
  explanation: string | null;
  isLoading?: boolean;
  followUpQuestions?: string[];
  onSelectFollowUp?: (question: string) => void;
}

export const ContextualAI: React.FC<ContextualAIProps> = ({
  title = 'AI Chemistry Insight',
  explanation,
  isLoading = false,
  followUpQuestions = [],
  onSelectFollowUp,
}) => {
  if (isLoading) {
    return (
      <div className="w-full bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-2xl backdrop-blur-xl animate-pulse flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-cyan-900/50 flex items-center justify-center text-cyan-400">
          🤖
        </div>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-slate-800 rounded w-1/4" />
          <div className="h-3 bg-slate-800/60 rounded w-3/4" />
        </div>
      </div>
    );
  }

  if (!explanation) return null;

  return (
    <div className="w-full bg-slate-900/80 border border-slate-800/90 rounded-2xl p-5 shadow-2xl backdrop-blur-xl flex flex-col gap-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Title Bar */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-teal-500 flex items-center justify-center text-white text-xs shadow-md">
            🤖
          </div>
          <h3 className="text-sm font-bold text-slate-100 font-sans tracking-wide">
            {title}
          </h3>
        </div>
        <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/80 px-2.5 py-0.5 rounded-full border border-cyan-800/50">
          ChemAI Qwen
        </span>
      </div>

      {/* Explanation Text Content */}
      <div className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans whitespace-pre-wrap">
        {explanation}
      </div>

      {/* Contextual Follow-up Question Chips */}
      {followUpQuestions.length > 0 && (
        <div className="pt-3 border-t border-slate-800/80 flex flex-col gap-2">
          <span className="text-[11px] font-bold text-slate-400 font-mono flex items-center gap-1.5">
            <span>💡</span>
            <span>Explore Follow-up Questions:</span>
          </span>
          <div className="flex flex-wrap gap-2">
            {followUpQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => onSelectFollowUp && onSelectFollowUp(q)}
                className="text-xs bg-slate-950/80 hover:bg-slate-800 text-cyan-300 hover:text-cyan-200 px-3 py-1.5 rounded-xl border border-cyan-800/50 hover:border-cyan-400 transition cursor-pointer font-sans shadow-sm flex items-center gap-1.5"
              >
                <span>💬</span>
                <span>{q}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
