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
];

const EXAMPLE_REACTION_PROMPTS = [
  'Show SN2 reaction of methyl bromide with hydroxide',
  'Show water formation reaction',
  'Show acid base neutralization',
];

export const PromptInput: React.FC<PromptInputProps> = ({ onSubmit, isLoading }) => {
  const [promptText, setPromptText] = useState('Show ethanol in 3D');

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
    <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            placeholder="Enter a molecule or reaction prompt (e.g. 'Show SN2 reaction...')..."
            className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 text-sm transition"
            disabled={isLoading}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !promptText.trim()}
          className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-medium px-6 py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-2 min-w-[120px]"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Generating...
            </>
          ) : (
            'Visualize'
          )}
        </button>
      </form>

      {/* Preset Example Prompts */}
      <div className="mt-3 flex flex-col gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-400 font-medium">Molecules:</span>
          {EXAMPLE_MOLECULE_PROMPTS.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => handleExampleClick(example)}
              disabled={isLoading}
              className="bg-slate-800/70 hover:bg-slate-800 text-cyan-400 hover:text-cyan-300 px-2.5 py-1 rounded-md border border-slate-700/60 transition"
            >
              {example}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-400 font-medium">Reactions:</span>
          {EXAMPLE_REACTION_PROMPTS.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => handleExampleClick(example)}
              disabled={isLoading}
              className="bg-slate-800/70 hover:bg-slate-800 text-amber-400 hover:text-amber-300 px-2.5 py-1 rounded-md border border-slate-700/60 transition"
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
