import React, { useState, useEffect } from 'react';
import type { ElementData } from '../types/reaction';
import { getCategoryColor } from '../three/scene';
import { fetchElementExplanation } from '../services/api';

interface ElementInfoPanelProps {
  element: ElementData | null;
}

export const ElementInfoPanel: React.FC<ElementInfoPanelProps> = ({ element }) => {
  const [explanation, setExplanation] = useState<string>('');
  const [loadingExplanation, setLoadingExplanation] = useState<boolean>(false);

  useEffect(() => {
    if (!element) return;
    let isMounted = true;
    setLoadingExplanation(true);
    setExplanation('');

    fetchElementExplanation(element).then((exp) => {
      if (isMounted) {
        setExplanation(exp || '');
        setLoadingExplanation(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [element?.atomic_number]);

  if (!element) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-slate-400 text-sm">
        Select an element from the periodic table to view properties.
      </div>
    );
  }

  const categoryColor = getCategoryColor(element.category);
  const shellDistribution = element.shells?.join(', ') || 'N/A';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl flex flex-col gap-4 font-sans backdrop-blur-xl">
      {/* Element Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center font-mono text-xl font-bold text-slate-950 shadow-md ring-1 ring-white/20"
            style={{ backgroundColor: element.cpk || categoryColor }}
          >
            {element.symbol}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-100">{element.name}</h2>
              <span
                className="text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize"
                style={{ backgroundColor: `${categoryColor}30`, color: categoryColor }}
              >
                {element.category}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Electron Shells: {shellDistribution}
            </p>
          </div>
        </div>

        <div className="text-right font-mono">
          <span className="text-xs text-slate-500 block uppercase font-medium">Atomic No.</span>
          <span className="text-xl font-black text-cyan-400">#{element.atomic_number}</span>
        </div>
      </div>

      {/* Properties Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-950/90 p-3 rounded-xl border border-slate-800/80">
          <span className="text-xs text-slate-500 block uppercase font-medium">Symbol</span>
          <span className="text-sm font-mono font-bold text-slate-100 mt-0.5 block">{element.symbol}</span>
        </div>

        <div className="bg-slate-950/90 p-3 rounded-xl border border-slate-800/80">
          <span className="text-xs text-slate-500 block uppercase font-medium">Atomic Mass</span>
          <span className="text-sm font-semibold text-slate-200 mt-0.5 block">
            {element.atomic_mass ? `${element.atomic_mass} u` : 'N/A'}
          </span>
        </div>

        <div className="bg-slate-950/90 p-3 rounded-xl border border-slate-800/80">
          <span className="text-xs text-slate-500 block uppercase font-medium">Group</span>
          <span className="text-sm font-semibold text-slate-200 mt-0.5 block">
            {element.group ? element.group : 'N/A'}
          </span>
        </div>

        <div className="bg-slate-950/90 p-3 rounded-xl border border-slate-800/80">
          <span className="text-xs text-slate-500 block uppercase font-medium">Period</span>
          <span className="text-sm font-semibold text-slate-200 mt-0.5 block">
            {element.period ? element.period : 'N/A'}
          </span>
        </div>

        <div className="bg-slate-950/90 p-3 rounded-xl border border-slate-800/80">
          <span className="text-xs text-slate-500 block uppercase font-medium">Electron Config</span>
          <span className="text-xs font-mono text-cyan-300 mt-0.5 block truncate" title={element.electron_configuration}>
            {element.electron_configuration || 'N/A'}
          </span>
        </div>

        <div className="bg-slate-950/90 p-3 rounded-xl border border-slate-800/80">
          <span className="text-xs text-slate-500 block uppercase font-medium">Shell Distribution</span>
          <span className="text-sm font-mono font-bold text-amber-300 mt-0.5 block">{shellDistribution}</span>
        </div>
      </div>

      {/* Summary note */}
      {element.summary && (
        <div className="text-xs text-slate-400 leading-relaxed bg-slate-950/50 p-3 rounded-xl border border-slate-800/60">
          <span className="font-bold text-slate-300">Quick Summary: </span>
          {element.summary}
        </div>
      )}

      {/* Dynamic ChemAI Explanation Card */}
      <div className="bg-slate-950/90 border border-cyan-800/70 rounded-2xl p-4 shadow-xl flex flex-col gap-3 font-sans">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-sm shadow-cyan-400" />
            <h3 className="text-xs font-bold text-cyan-200 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <span>✨ AI Element Explanation</span>
              <span className="text-[10px] text-cyan-400 font-normal normal-case bg-cyan-950 px-2 py-0.5 rounded-full border border-cyan-800/70">
                ChemAI Qwen
              </span>
            </h3>
          </div>
          {loadingExplanation && (
            <span className="text-[11px] font-mono text-slate-400 animate-pulse flex items-center gap-1">
              <span>Reasoning...</span>
            </span>
          )}
        </div>

        {loadingExplanation ? (
          <div className="py-4 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs font-mono">
            <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            <span>Generating comprehensive AI chemistry explanation for {element.name}...</span>
          </div>
        ) : (
          <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-line space-y-2 font-mono">
            {explanation}
          </div>
        )}
      </div>
    </div>
  );
};
