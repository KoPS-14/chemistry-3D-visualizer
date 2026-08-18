import React from 'react';
import type { ElementData } from '../types/reaction';
import { getCategoryColor } from '../three/scene';

interface ElementInfoPanelProps {
  element: ElementData | null;
}

export const ElementInfoPanel: React.FC<ElementInfoPanelProps> = ({ element }) => {
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
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col gap-4">
      {/* Element Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center font-mono text-xl font-bold text-slate-950 shadow-md"
            style={{ backgroundColor: element.cpk || categoryColor }}
          >
            {element.symbol}
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">{element.name}</h2>
            <span
              className="text-xs font-medium px-2 py-0.5 rounded capitalize"
              style={{ backgroundColor: `${categoryColor}30`, color: categoryColor }}
            >
              {element.category}
            </span>
          </div>
        </div>

        <div className="text-right font-mono">
          <span className="text-xs text-slate-500 block uppercase">Atomic No.</span>
          <span className="text-lg font-bold text-cyan-400">#{element.atomic_number}</span>
        </div>
      </div>

      {/* Properties Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80">
          <span className="text-xs text-slate-500 block uppercase font-medium">Symbol</span>
          <span className="text-sm font-mono font-bold text-slate-100 mt-0.5 block">{element.symbol}</span>
        </div>

        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80">
          <span className="text-xs text-slate-500 block uppercase font-medium">Atomic Mass</span>
          <span className="text-sm font-semibold text-slate-200 mt-0.5 block">
            {element.atomic_mass ? `${element.atomic_mass} u` : 'N/A'}
          </span>
        </div>

        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80">
          <span className="text-xs text-slate-500 block uppercase font-medium">Group</span>
          <span className="text-sm font-semibold text-slate-200 mt-0.5 block">
            {element.group ? element.group : 'N/A'}
          </span>
        </div>

        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80">
          <span className="text-xs text-slate-500 block uppercase font-medium">Period</span>
          <span className="text-sm font-semibold text-slate-200 mt-0.5 block">
            {element.period ? element.period : 'N/A'}
          </span>
        </div>

        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80">
          <span className="text-xs text-slate-500 block uppercase font-medium">Electron Config</span>
          <span className="text-xs font-mono text-cyan-300 mt-0.5 block truncate" title={element.electron_configuration}>
            {element.electron_configuration || 'N/A'}
          </span>
        </div>

        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80">
          <span className="text-xs text-slate-500 block uppercase font-medium">Shell Distribution</span>
          <span className="text-sm font-mono font-bold text-amber-300 mt-0.5 block">{shellDistribution}</span>
        </div>
      </div>

      {/* Element Summary / Description */}
      {element.summary && (
        <div className="pt-2 border-t border-slate-800/80 text-xs text-slate-400 leading-relaxed">
          <span className="font-semibold text-slate-300">Summary: </span>
          {element.summary}
        </div>
      )}
    </div>
  );
};
