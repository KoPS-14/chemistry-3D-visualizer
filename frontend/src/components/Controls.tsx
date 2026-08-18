import React from 'react';

interface ControlsProps {
  wireframe: boolean;
  onToggleWireframe: () => void;
  onResetView: () => void;
}

export const Controls: React.FC<ControlsProps> = ({
  wireframe,
  onToggleWireframe,
  onResetView,
}) => {
  return (
    <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-lg p-2 backdrop-blur-sm">
      <button
        onClick={onToggleWireframe}
        className={`px-3 py-1.5 rounded text-xs font-medium transition flex items-center gap-1.5 ${
          wireframe
            ? 'bg-cyan-600 text-white'
            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
        }`}
        title="Toggle Wireframe Mode"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
        Wireframe
      </button>

      <button
        onClick={onResetView}
        className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded text-xs font-medium transition flex items-center gap-1.5"
        title="Reset 3D View"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Reset Camera
      </button>
    </div>
  );
};
