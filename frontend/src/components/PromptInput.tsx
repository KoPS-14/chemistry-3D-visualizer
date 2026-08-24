import React, { useState } from 'react';

interface PromptInputProps {
  onSubmit: (prompt: string) => void;
  isLoading: boolean;
}

const EXAMPLE_MOLECULE_PROMPTS = [
  'Show ethanol in 3D',
  'Show water in 3D',
  'Show methane in 3D',
  'Show aspirin in 3D',
  'Show glucose in 3D',
];

const EXAMPLE_REACTION_PROMPTS = [
  'Show SN2 reaction of methyl bromide with hydroxide',
  'Show water formation reaction',
  'Show acid base neutralization',
  'Show Haber process synthesis',
  'Show Esterification reaction',
];

export const PromptInput: React.FC<PromptInputProps> = ({ onSubmit, isLoading }) => {
  const [promptText, setPromptText] = useState('Show SN2 reaction of methyl bromide with hydroxide');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (promptText.trim() && !isLoading) {
      onSubmit(promptText.trim());
    }
  };

  const handleExampleClick = (example: string) => {
    setPromptText(example);
    if (!isLoading) {
      onSubmit(example);
    }
  };

  return (
    <div className="w-full bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-2xl backdrop-blur-xl">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            placeholder="Enter a molecule or reaction prompt (e.g. 'Show SN2 reaction...')..."
            className="w-full bg-slate-950/90 border border-slate-700/80 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 text-xs sm:text-sm transition shadow-inner font-mono"
            disabled={isLoading}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !promptText.trim()}
          className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 text-white font-semibold px-7 py-3 rounded-xl text-xs sm:text-sm transition-all shadow-lg shadow-cyan-600/30 flex items-center justify-center gap-2 min-w-[130px] cursor-pointer"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Optimizing...</span>
            </>
          ) : (
            <>
              <span>⚡</span>
              <span>Visualize 3D</span>
            </>
          )}
        </button>
      </form>

      {/* Preset Example Prompts */}
      <div className="mt-4 flex flex-col gap-2.5 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-400 font-semibold font-mono text-[11px]">🧪 Molecules:</span>
          {EXAMPLE_MOLECULE_PROMPTS.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => handleExampleClick(example)}
              disabled={isLoading}
              className="bg-slate-950/80 hover:bg-slate-800 text-cyan-400 hover:text-cyan-300 px-3 py-1 rounded-lg border border-cyan-900/40 transition cursor-pointer font-mono text-[11px] shadow-sm"
            >
              {example}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-400 font-semibold font-mono text-[11px]">🔥 Reactions:</span>
          {EXAMPLE_REACTION_PROMPTS.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => handleExampleClick(example)}
              disabled={isLoading}
              className="bg-slate-950/80 hover:bg-slate-800 text-amber-400 hover:text-amber-300 px-3 py-1 rounded-lg border border-amber-900/40 transition cursor-pointer font-mono text-[11px] shadow-sm"
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
